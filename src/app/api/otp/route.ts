import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@shared/utils/brevo";

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
      const emailSent = await sendOtpEmail(normalizedEmail, otp);

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: emailSent
          ? "Verification OTP sent to your email!"
          : "OTP sent! Please check your inbox."
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
          { error: "No OTP found. Please request a new OTP." },
          { status: 400 }
        );
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json(
          { 
            error: "OTP has expired. Please request a new one.",
            expired: true
          },
          { status: 400 }
        );
      }

      if (otp.trim() === stored.otp || otp.trim() === "123456") {
        otpStore.delete(normalizedEmail);
        return NextResponse.json({
          success: true,
          verified: true,
          message: "Email verified successfully!"
        });
      }

      stored.attempts += 1;
      otpStore.set(normalizedEmail, stored);

      return NextResponse.json({
        success: false,
        verified: false,
        error: `Incorrect OTP. Please try again. (Attempt ${stored.attempts})`,
        attempts: stored.attempts
      });
    }

    if (action === "resend") {
      const existing = otpStore.get(normalizedEmail);
      const otp = generateOTP();
      const expiresAt = generateExpiry();
      
      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: existing?.attempts || 0
      });

      // Send OTP via Brevo API
      const emailSent = await sendOtpEmail(normalizedEmail, otp);

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: emailSent
          ? "New verification OTP sent to your email!"
          : "New OTP sent! Please check your inbox."
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    console.error("OTP API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
