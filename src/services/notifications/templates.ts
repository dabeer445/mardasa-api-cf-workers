import type {
  StudentCreatedData,
  PaymentReceivedData,
  FeeReminderData,
  AnnouncementData,
} from './events';

function footer(madrassaName: string): string {
  return [
    '',
    '---',
    `_${madrassaName}_`,
  ].join('\n');
}

export function formatStudentCreated(data: StudentCreatedData, madrassaName: string): string {
  const lines = [
    `🎓 *Welcome to ${madrassaName}!*`,
    '',
    `Assalamu Alaikum ${data.student.parentName},`,
    '',
    `Your child *${data.student.name}* has been enrolled successfully.`,
    '',
    `📋 *Details:*`,
    `• GR Number: ${data.student.grNumber}`,
  ];

  if (data.className) {
    lines.push(`• Class: ${data.className}`);
  }

  lines.push(
    `• Monthly Fee: Rs. ${data.student.monthlyFee.toLocaleString()}`,
    '',
    `JazakAllah Khair for choosing us.`,
  );

  return lines.join('\n') + footer(madrassaName);
}

export function formatPaymentReceived(data: PaymentReceivedData, madrassaName: string): string {
  const lines = [
    `✅ *Payment Received*`,
    '',
    `Assalamu Alaikum,`,
    '',
    `We have received your payment for *${data.student.name}*.`,
    '',
    `📋 *Details:*`,
    `• Amount: Rs. ${data.payment.amount.toLocaleString()}`,
    `• Type: ${data.payment.feeType}`,
    `• Date: ${data.payment.date}`,
  ];

  if (data.payment.month) {
    lines.push(`• For Month: ${data.payment.month}`);
  }

  lines.push(
    '',
    `JazakAllah Khair.`,
  );

  return lines.join('\n') + footer(madrassaName);
}

export function formatFeeReminder(data: FeeReminderData, madrassaName: string): string {
  const monthName = new Date(data.month + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const lines = [
    `📢 *Fee Reminder*`,
    '',
    `Assalamu Alaikum,`,
    '',
    `This is a gentle reminder that the fee for *${data.student.name}* (${data.student.grNumber}) for ${monthName} is pending.`,
    '',
    `• Amount Due: Rs. ${data.student.monthlyFee.toLocaleString()}`,
    `• Due Date: ${data.dueDate}th of the month`,
    '',
    `Please pay at your earliest convenience.`,
    '',
    `JazakAllah Khair.`,
  ];

  return lines.join('\n') + footer(madrassaName);
}

export function formatAnnouncement(data: AnnouncementData, madrassaName: string): string {
  const lines = [
    `📢 *Announcement*`,
    '',
    data.message,
  ];

  return lines.join('\n') + footer(madrassaName);
}
