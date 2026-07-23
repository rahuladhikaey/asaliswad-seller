import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Create or get user with auto-confirmation (email_confirm: true)
    let user;
    const { data: authData, error: createError } = await supabaseServer.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Auto-confirm email so NO Supabase link email is sent!
      user_metadata: {
        full_name: fullName,
        role: "seller",
        phone: phone,
      },
    });

    if (createError) {
      const message = createError.message.toLowerCase();
      if (message.includes("already registered") || message.includes("duplicate")) {
        // If user already exists, update user password and confirm email
        const { data: listData } = await supabaseServer.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

        if (existingUser) {
          const { data: updatedData, error: updateError } = await supabaseServer.auth.admin.updateUserById(
            existingUser.id,
            {
              password,
              email_confirm: true,
              user_metadata: { full_name: fullName, role: "seller", phone: phone }
            }
          );
          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
          }
          user = updatedData.user;
        } else {
          return NextResponse.json({ error: createError.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
    } else {
      user = authData.user;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user?.id,
        email: user?.email,
        confirmed_at: user?.confirmed_at,
      },
      message: "Seller account created and verified successfully!",
    });

  } catch (error) {
    console.error("Seller Auth API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
