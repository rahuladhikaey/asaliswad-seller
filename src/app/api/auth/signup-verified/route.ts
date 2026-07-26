import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    // 1. Attempt admin creation with auto-confirmation first
    try {
      const { data: authData, error: createError } = await supabaseServer.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || "Seller",
          role: "seller",
          phone: phone || "",
        },
      });

      if (!createError && authData?.user) {
        user = authData.user;
      } else if (createError) {
        const errMsg = createError.message?.toLowerCase() || "";
        if (errMsg.includes("already registered") || errMsg.includes("duplicate") || errMsg.includes("exists")) {
          // User already exists in auth.users: locate user and update password/metadata cleanly
          const { data: listData } = await supabaseServer.auth.admin.listUsers();
          const existingUser = listData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

          if (existingUser) {
            const { data: updatedData, error: updateError } = await supabaseServer.auth.admin.updateUserById(existingUser.id, {
              password: password,
              email_confirm: true,
              user_metadata: {
                ...existingUser.user_metadata,
                full_name: fullName || existingUser.user_metadata?.full_name || "Seller",
                role: "seller",
                phone: phone || existingUser.phone || "",
              },
            });
            if (!updateError && updatedData?.user) {
              user = updatedData.user;
            } else {
              user = existingUser;
            }
          } else {
            // Standard signup fallback
            const signUpRes = await supabaseServer.auth.signUp({
              email: normalizedEmail,
              password,
              options: {
                data: { full_name: fullName, role: "seller", phone: phone },
              },
            });
            if (signUpRes.error) {
              return NextResponse.json({ success: false, error: signUpRes.error.message }, { status: 400 });
            }
            user = signUpRes.data.user;
          }
        } else {
          // Standard signup fallback
          const signUpRes = await supabaseServer.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: { full_name: fullName, role: "seller", phone: phone },
            },
          });
          if (signUpRes.error) {
            return NextResponse.json({ success: false, error: signUpRes.error.message }, { status: 400 });
          }
          user = signUpRes.data.user;
        }
      }
    } catch (adminErr: any) {
      console.warn("[Seller Auth API Notice] Admin create user fallback:", adminErr?.message || adminErr);
      const signUpRes = await supabaseServer.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: fullName, role: "seller", phone: phone },
        },
      });
      if (signUpRes.error) {
        return NextResponse.json({ success: false, error: signUpRes.error.message }, { status: 400 });
      }
      user = signUpRes.data.user;
    }

    // Upsert role in public.profiles table
    if (user?.id) {
      try {
        await supabaseServer.from("profiles").upsert({
          id: user.id,
          email: normalizedEmail,
          full_name: fullName || "Seller",
          role: "seller",
          status: "active",
          updated_at: new Date().toISOString(),
        });
      } catch (profErr) {
        console.warn("Profiles role upsert notice:", profErr);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user?.id,
        email: user?.email,
        confirmed_at: user?.confirmed_at || new Date().toISOString(),
      },
      message: "Seller account created and verified successfully!",
    });

  } catch (error: any) {
    console.error("Seller Auth API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Verification failed. Please check your credentials and try again." },
      { status: 400 }
    );
  }
}
