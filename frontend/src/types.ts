export type Role = 'ADMIN' | 'TUTOR' | 'PARENT';
export type LessonType = 'GROUP' | 'INDIVIDUAL' | 'TRIAL';
export type LessonStatus = 'PLANNED' | 'DONE' | 'CANCELLED';
export type PaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL';

export type User = {
  id: number;
  login: string;
  role: Role;
  created_at: string;
};

export type Tutor = {
  id: number;
  user_id: number | null;
  name: string;
  gender: string | null;
  phone: string | null;
  telegram: string | null;
  whatsapp: string | null;
  rate_per_hour: string;
};

export type Client = {
  id: number;
  name: string;
  parent_id: number | null;
  tutor_id: number | null;
  phone: string | null;
  subject: string | null;
};

export type Lesson = {
  id: number;
  type: LessonType;
  date: string;
  start_time: string;
  duration_minutes: number;
  classroom: string | null;
  subject: string;
  topic: string | null;
  tutor_id: number;
  client_id: number;
  status: LessonStatus;
  payment_status: PaymentStatus;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
};

export type SalaryReportItem = {
  tutor_id: number;
  tutor_name: string;
  lessons_count: number;
  minutes: number;
  hours: number | string;
  salary: number | string;
};

export type LessonsReport = {
  total: number;
  planned: number;
  done: number;
  cancelled: number;
  trial_total: number;
  trial_converted: number;
  trial_conversion_percent: number | string;
};
