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

    // Find existing user by email in auth.users
    let existingUser = null;
    try {
      const { data: listData } = await supabaseServer.auth.admin.listUsers();
      existingUser = listData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
    } catch (e) {
      console.warn("Could not list users via admin API:", e);
    }

    if (!existingUser) {
      // Check if user exists in sellers database table
      const { data: sellerRow } = await supabaseServer
        .from("sellers")
        .select("*")
        .eq("email", normalizedEmail)
        .maybeSingle();

      // If seller exists in DB table or new seller, attempt to create/signup in auth.users
      try {
        const { data: createdData, error: createError } = await supabaseServer.auth.admin.createUser({
          email: normalizedEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            full_name: sellerRow?.full_name || sellerRow?.owner_name || "Seller",
            role: "seller",
            phone: sellerRow?.phone_number || sellerRow?.mobile_number || "",
          },
        });

        if (!createError && createdData?.user) {
          existingUser = createdData.user;
        } else {
          // Fallback to standard auth.signUp
          const { data: signUpData, error: signUpError } = await supabaseServer.auth.signUp({
            email: normalizedEmail,
            password: newPassword,
            options: {
              data: {
                full_name: sellerRow?.full_name || sellerRow?.owner_name || "Seller",
                role: "seller",
              },
            },
          });

          if (signUpData?.user) {
            existingUser = signUpData.user;
          } else if (signUpError) {
            // Send standard Supabase reset password email as final fallback
            await supabaseServer.auth.resetPasswordForEmail(normalizedEmail);
            return NextResponse.json({
              success: true,
              message: "A password reset confirmation link has also been dispatched to your email address."
            });
          }
        }
      } catch (err: any) {
        // Final fallback: resetPasswordForEmail
        await supabaseServer.auth.resetPasswordForEmail(normalizedEmail);
        return NextResponse.json({
          success: true,
          message: "Password reset request processed! Please check your email for confirmation."
        });
      }
    } else {
      // Update password and confirm email via admin client
      const { error: updateError } = await supabaseServer.auth.admin.updateUserById(
        existingUser.id,
        {
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            role: "seller",
          },
        }
      );

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }
    }

    // Ensure seller record in database has user_id linked and role updated in profiles
    if (existingUser?.id) {
      try {
        await supabaseServer
          .from("sellers")
          .update({ user_id: existingUser.id, status: "approved" })
          .eq("email", normalizedEmail);

        await supabaseServer.from("profiles").upsert({
          id: existingUser.id,
          email: normalizedEmail,
          role: "seller",
          status: "active",
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn("Notice updating seller user_id / profiles link:", dbErr);
      }
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

