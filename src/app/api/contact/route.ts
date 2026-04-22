import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with the provided key
const resend = new Resend(process.env.RESEND_API_KEY || 're_EXzt9ySt_HWSa9UXoPEVcJXHhg1ZLrZkY');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, message } = body;

    // Validate inputs
    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required fields.' },
        { status: 400 }
      );
    }

    // Send the email via Resend
    const data = await resend.emails.send({
      from: 'Portfolio Contact <onboarding@resend.dev>', // Resend's default testing domain
      to: 'jihed.hagui7@gmail.com', // Your target email
      subject: `New Message from Portfolio: ${email}`,
      replyTo: email,
      html: `
        <h2>New Message Received</h2>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <div style="padding: 12px; border-left: 4px solid #333; background-color: #f9f9f9; color: #111;">
          ${message.replace(/\n/g, '<br/>')}
        </div>
      `,
    });

    if (data.error) {
       console.error("Resend delivery issue:", data.error);
       return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while sending the message.' },
      { status: 500 }
    );
  }
}
