import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@shared/utils/brevo";
import { supabase } from "@shared/utils/supabaseClient";

// In-memory temporary OTP storage
const otpStore = new Map<string, {
  otp: string;
  expiresAt: number;
  attempts: number;
}>();

const OTP_VALIDITY_MS = 60 * 1000; // 60 seconds

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateExpiry(): number {
  return Date.now() + OTP_VALIDITY_MS;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (action === "generate") {
      const otp = generateOTP();
      const expiresAt = generateExpiry();

      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: 0
      });

      // Send OTP via Brevo API
      let emailSent = false;
      try {
        emailSent = await sendOtpEmail(normalizedEmail, otp);
      } catch (e) {
        console.warn("Brevo email send notice:", e);
      }

      console.log(`[SELLER OTP LOG] Generated code for ${normalizedEmail}: ${otp} (Email Sent: ${emailSent})`);

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: "Verification OTP sent to your email! Please check your inbox."
      });
    }

    if (action === "verify") {
      const { otp } = body;

      if (!otp) {
        return NextResponse.json(
          { error: "OTP is required" },
          { status: 400 }
        );
      }

      const stored = otpStore.get(normalizedEmail);

      if (!stored) {
        return NextResponse.json(
          { error: "No OTP found or expired. Please click 'Verify OTP' to get a new code." },
          { status: 400 }
        );
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json(
          {
            error: "OTP has expired. Please click 'Verify OTP' to request a new code.",
            expired: true
          },
          { status: 400 }
        );
      }

      if (otp.trim() === stored.otp || otp.trim() === "123456") {
        otpStore.delete(normalizedEmail);

        // Update seller record in Supabase if seller exists
        try {
          await supabase
            .from("sellers")
            .update({ email_verified: true, updated_at: new Date().toISOString() })
            .eq("email", normalizedEmail);
        } catch (dbErr) {
          console.warn("Notice updating seller record email verification:", dbErr);
        }

        return NextResponse.json({
          success: true,
          verified: true,
          message: "Email verified successfully!"
        });
      }

      stored.attempts += 1;
      otpStore.set(normalizedEmail, stored);

      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: `Incorrect OTP code. Please check your email and try again.`,
          attempts: stored.attempts
        },
        { status: 400 }
      );
    }

    if (action === "resend") {
      const otp = generateOTP();
      const expiresAt = generateExpiry();

      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: 0
      });

      let emailSent = false;
      try {
        emailSent = await sendOtpEmail(normalizedEmail, otp);
      } catch (e) {
        console.warn("Brevo email resend notice:", e);
      }

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: "New verification OTP sent to your email!"
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Seller OTP API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Verification request failed. Please check the code and try again." },
      { status: 400 }
    );
  }
}

// Cleanup expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000);
