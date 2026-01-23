export type NotificationEvent =
  | 'STUDENT_CREATED'
  | 'PAYMENT_RECEIVED'
  | 'FEE_REMINDER'
  | 'ANNOUNCEMENT';

export interface StudentCreatedData {
  student: {
    name: string;
    grNumber: string;
    parentName: string;
    phone: string;
    monthlyFee: number;
  };
  className?: string;
}

export interface PaymentReceivedData {
  payment: {
    amount: number;
    feeType: string;
    date: string;
    month?: string;
  };
  student: {
    name: string;
    grNumber: string;
    phone: string;
  };
}

export interface FeeReminderData {
  student: {
    name: string;
    grNumber: string;
    phone: string;
    monthlyFee: number;
  };
  month: string;
  dueDate: number;
}

export interface AnnouncementData {
  message: string;
  phones: string[];
}

export type NotificationData = {
  STUDENT_CREATED: StudentCreatedData;
  PAYMENT_RECEIVED: PaymentReceivedData;
  FEE_REMINDER: FeeReminderData;
  ANNOUNCEMENT: AnnouncementData;
};
