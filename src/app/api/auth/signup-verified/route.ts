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
    let user: any = null;

    // 1. Check if seller exists in public.sellers database table
    const { data: existingSeller } = await supabaseServer
      .from("sellers")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const sellerName = fullName || existingSeller?.full_name || existingSeller?.owner_name || "Seller";
    const sellerPhone = phone || existingSeller?.mobile_number || existingSeller?.phone_number || "";

    // 2. Attempt admin creation first
    try {
      const { data: authData, error: createError } = await supabaseServer.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: sellerName,
          role: "seller",
          phone: sellerPhone,
        },
      });

      if (!createError && authData?.user) {
        user = authData.user;
      }
    } catch (adminErr) {
      console.warn("Admin create user notice:", adminErr);
    }

    // 3. Fallback: Standard supabase.auth.signUp
    if (!user) {
      const { data: signUpData, error: signUpError } = await supabaseServer.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: sellerName,
            role: "seller",
            phone: sellerPhone,
          },
        },
      });

      if (signUpData?.user) {
        user = signUpData.user;
      } else if (signUpError) {
        // If user already exists in auth.users, attempt sign in to verify credentials
        const { data: signInData } = await supabaseServer.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInData?.user) {
          user = signInData.user;
        } else {
          return NextResponse.json(
            { success: false, error: signUpError.message || "Failed to register seller in Supabase Authentication." },
            { status: 400 }
          );
        }
      }
    }

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: "Unable to establish seller account in Supabase Authentication." },
        { status: 400 }
      );
    }

    // 4. Update role in public.profiles table
    try {
      await supabaseServer.from("profiles").upsert({
        id: user.id,
        email: normalizedEmail,
        full_name: sellerName,
        role: "seller",
        status: "active",
        updated_at: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn("Profiles upsert notice:", profErr);
    }

    // 5. Link user_id in public.sellers database table
    try {
      if (existingSeller) {
        await supabaseServer
          .from("sellers")
          .update({
            user_id: user.id,
            status: existingSeller.status || "approved",
            email_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("email", normalizedEmail);
      }
    } catch (selErr) {
      console.warn("Sellers update user_id notice:", selErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: "seller",
        confirmed_at: user.confirmed_at || new Date().toISOString(),
      },
      message: "Seller account successfully registered and linked in Supabase Authentication!",
    });

  } catch (error: any) {
    console.error("Seller Auth Signup API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Registration failed. Please try again." },
      { status: 400 }
    );
  }
}
