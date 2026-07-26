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

    // 1. Try native database RPC function to update password & auto-confirm email directly
    try {
      const { data: rpcSuccess, error: rpcError } = await supabaseServer.rpc("reset_seller_password", {
        target_email: normalizedEmail,
        new_password: newPassword,
      });

      if (!rpcError && rpcSuccess === true) {
        return NextResponse.json({
          success: true,
          message: "Password updated successfully! You can now sign in with your new password."
        });
      }
    } catch (rpcErr) {
      console.warn("RPC reset password notice:", rpcErr);
    }

    // 2. Admin API fallback (if service role key is available)
    let existingUser = null;
    try {
      const { data: listData } = await supabaseServer.auth.admin.listUsers();
      existingUser = listData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
      
      if (existingUser) {
        const { error: updateError } = await supabaseServer.auth.admin.updateUserById(
          existingUser.id,
          {
            password: newPassword,
            email_confirm: true,
          }
        );
        if (!updateError) {
          return NextResponse.json({
            success: true,
            message: "Password updated successfully! You can now sign in with your new password."
          });
        }
      }
    } catch (adminErr) {
      console.warn("Admin update password notice:", adminErr);
    }

    // 3. Fallback: Register/Create user in auth.users if not yet present
    const { data: signUpData, error: signUpError } = await supabaseServer.auth.signUp({
      email: normalizedEmail,
      password: newPassword,
      options: {
        data: {
          role: "seller",
        },
      },
    });

    if (signUpData?.user) {
      // Link user_id in public.sellers
      await supabaseServer
        .from("sellers")
        .update({ user_id: signUpData.user.id, email_verified: true })
        .eq("email", normalizedEmail);

      return NextResponse.json({
        success: true,
        message: "Account registered and password updated successfully! You can now log in."
      });
    }

    return NextResponse.json({
      success: true,
      message: "Password update request processed. Please check your email if confirmation is required."
    });

  } catch (error: any) {
    console.error("Reset Password API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
