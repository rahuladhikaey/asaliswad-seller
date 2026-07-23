import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find existing user by email
    const { data: listData } = await supabaseServer.auth.admin.listUsers();
    const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (!existingUser) {
      return NextResponse.json(
        { error: "No user found with this email address." },
        { status: 404 }
      );
    }

    // Update password and confirm email via admin client
    const { error: updateError } = await supabaseServer.auth.admin.updateUserById(
      existingUser.id,
      {
        password: newPassword,
        email_confirm: true,
      }
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password."
    });

  } catch (error) {
    console.error("Reset Password API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
