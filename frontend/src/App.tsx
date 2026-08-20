import {
  CalendarDays,
  Check,
  Copy,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { authApi, clientsApi, lessonsApi, reportsApi, tokenStore, tutorsApi, usersApi } from './api';
import type { Client, Lesson, LessonsReport, LessonStatus, LessonType, Role, SalaryReportItem, Tutor, User } from './types';

type Page = 'profile' | 'lessons' | 'students' | 'clients' | 'tutors' | 'users' | 'admins' | 'reports';
type ViewMode = 'day' | 'week' | 'month';

function roleLabel(role: Role): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Супер Админ';
    case 'ADMIN':
      return 'Администратор';
    case 'TUTOR':
      return 'Преподаватель';
    case 'PARENT':
      return 'Родитель';
    default:
      return role;
  }
}

function roleBadgeClass(role: Role): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'badge badge-superadmin';
    case 'ADMIN':
      return 'badge badge-admin';
    case 'TUTOR':
      return 'badge badge-tutor';
    case 'PARENT':
      return 'badge badge-parent';
    default:
      return 'badge';
  }
}

function generateRandomPassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="lesson-link">
          {part}
        </a>
      );
    }
    return part;
  });
}

const emptyLesson: Omit<Lesson, 'id'> = {
  type: 'INDIVIDUAL',
  date: new Date().toISOString().slice(0, 10),
  start_time: '10:00',
  duration_minutes: 60,
  classroom: '',
  subject: 'Математика',
  topic: '',
  tutor_id: 0,
  client_id: 0,
  status: 'PLANNED',
  payment_status: 'UNPAID',
};

const emptyTutor: Omit<Tutor, 'id'> = {
  user_id: null,
  name: '',
  gender: '',
  phone: '',
  telegram: '',
  whatsapp: '',
  rate_per_hour: '0',
};

const emptyClient: Omit<Client, 'id'> = {
  name: '',
  parent_id: null,
  tutor_id: null,
  phone: '',
  subject: 'Математика',
};

const VALID_PAGES: Page[] = ['profile', 'lessons', 'students', 'clients', 'tutors', 'users', 'admins', 'reports'];

function normalizePage(raw: string): Page {
  if (raw === 'clients') return 'students';
  if (VALID_PAGES.includes(raw as Page)) return raw as Page;
  return 'lessons';
}

function getInitialPage(): Page {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    return normalizePage(hash);
  }
  const saved = localStorage.getItem('pro100_active_page');
  if (saved) {
    return normalizePage(saved);
  }
  return 'lessons';
}

function AppShell() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPageState] = useState<Page>(getInitialPage);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const setPage = (newPage: Page) => {
    const normalized = normalizePage(newPage);
    setPageState(normalized);
    window.location.hash = normalized;
    localStorage.setItem('pro100_active_page', normalized);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const normalized = normalizePage(hash);
      setPageState(normalized);
      localStorage.setItem('pro100_active_page', normalized);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!tokenStore.refresh) {
      setLoading(false);
      return;
    }
    authApi
      .refresh(tokenStore.refresh)
      .then((tokens) => {
        tokenStore.set(tokens);
        setUser(tokens.user);
      })
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!user) return;
    if (page === 'admins' && !isSuperAdmin) {
      setPage('lessons');
    } else if ((page === 'reports' || page === 'users') && !isAdmin) {
      setPage('lessons');
    }
  }, [user, page, isSuperAdmin, isAdmin]);

  if (loading) return <div className="screen-center">Загрузка...</div>;
  if (!user) return <Login onLogin={setUser} />;

  const nav = [
    { id: 'profile' as const, title: 'Мой профиль', icon: UserRound, visible: true },
    { id: 'lessons' as const, title: 'Уроки', icon: CalendarDays, visible: true },
    { id: 'students' as const, title: 'Ученики', icon: Users, visible: true },
    { id: 'tutors' as const, title: 'Педагоги', icon: GraduationCap, visible: true },
    { id: 'reports' as const, title: 'Отчёты', icon: LayoutDashboard, visible: isAdmin },
    { id: 'users' as const, title: 'Пользователи', icon: SlidersHorizontal, visible: isAdmin },
    { id: 'admins' as const, title: 'Администраторы', icon: ShieldCheck, visible: isSuperAdmin },
  ].filter((item) => item.visible);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>p100</span> pro100_repik</div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={page === item.id || (item.id === 'students' && page === 'clients') ? 'active' : ''}
              onClick={() => setPage(item.id)}
            >
              <item.icon size={18} />
              {item.title}
            </button>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <label className="search" htmlFor="global_search">
            <Search size={18} />
            <input
              id="global_search"
              name="global_search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск"
            />
          </label>
          <div className="profile-chip">
            <span>{user.login}</span>
            <span className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</span>
            <button
              title="Выйти"
              onClick={() => {
                tokenStore.clear();
                setUser(null);
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main>
          {page === 'profile' && <Profile user={user} />}
          {page === 'lessons' && <LessonsPage user={user} />}
          {(page === 'students' || page === 'clients') && <StudentsPage user={user} search={query} />}
          {page === 'tutors' && <TutorsPage user={user} />}
          {page === 'reports' && <ReportsPage />}
          {page === 'users' && <UsersManagementPage currentUser={user} />}
          {page === 'admins' && isSuperAdmin && <AdminsManagementPage currentUser={user} />}
        </main>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('admin12345');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const tokens = await authApi.login(login, password);
      tokenStore.set(tokens);
      onLogin(tokens.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand large"><span>p100</span> pro100_repik</div>
        <h1>Вход в систему</h1>
        <label htmlFor="login_username">Логин</label>
        <input
          id="login_username"
          name="username"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          placeholder="Логин"
          autoComplete="username"
          required
        />
        <label htmlFor="login_password">Пароль</label>
        <input
          id="login_password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Пароль"
          type="password"
          autoComplete="current-password"
          required
        />
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">Войти</button>
      </form>
    </div>
  );
}

function Profile({ user }: { user: User }) {
  return (
    <section className="panel">
      <h1>Мой профиль</h1>
      <p>Информация о текущем авторизованном аккаунте.</p>
      <div className="metrics">
        <Metric title="Логин" value={user.login} />
        <Metric title="Роль" value={roleLabel(user.role)} />
        <Metric title="Дата регистрации" value={new Date(user.created_at).toLocaleDateString('ru-RU')} />
      </div>

      <div className="sub-panel" style={{ marginTop: '20px' }}>
        <h3>Права доступа вашей роли ({roleLabel(user.role)})</h3>
        {user.role === 'SUPER_ADMIN' && (
          <p>
            👑 <strong>Супер Администратор:</strong> Полный контроль над системой. Только вы можете создавать и
            редактировать администраторов, менять им пароли и логины, а также управлять всеми данными системы.
          </p>
        )}
        {user.role === 'ADMIN' && (
          <p>
            🛡️ <strong>Администратор:</strong> Управление преподавателями, родителями, учениками, расписанием уроков и отчетами. Выдача и смена логинов и паролей для преподавателей и родителей.
          </p>
        )}
        {user.role === 'TUTOR' && (
          <p>
            🎓 <strong>Преподаватель:</strong> Личный кабинет с просмотром ваших занятий, учеников, отметкой проведения уроков и расчетом часов и зарплаты.
          </p>
        )}
        {user.role === 'PARENT' && (
          <p>
            👨‍👩‍👦 <strong>Родитель:</strong> Личный кабинет с просмотром расписания ваших детей (учеников), статусов проведенных уроков и информации об оплатах.
          </p>
        )}
      </div>
    </section>
  );
}

function LessonsPage({ user }: { user: User }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [view, setView] = useState<ViewMode>('week');
  const [activeModal, setActiveModal] = useState<'create' | Lesson | null>(null);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', tutor_id: '', subject: '', type: '', payment_status: '' });

  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

  const load = () => {
    lessonsApi.list(filters).then(setLessons).catch(() => setLessons([]));
    tutorsApi.list().then(setTutors).catch(() => setTutors([]));
    clientsApi.list().then(setClients).catch(() => setClients([]));
  };

  // Automatically filter whenever any filter changes
  useEffect(() => {
    load();
  }, [filters]);

  async function handleDeleteLesson(id: number) {
    if (!window.confirm('Удалить это занятие?')) return;
    try {
      await lessonsApi.delete(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить');
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Календарь занятий</h1>
          <p>Сетка 08:00-20:00, мгновенные фильтры, статусы и управление уроками.</p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={() => setActiveModal('create')}>
            <Plus size={18} /> Добавить занятие
          </button>
        )}
      </div>
      <div className="toolbar">
        <Segment<ViewMode> value={view} onChange={setView} options={[['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц']]} />
        <input
          id="filter_date_from"
          name="filter_date_from"
          type="date"
          title="Дата с"
          value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
        />
        <input
          id="filter_date_to"
          name="filter_date_to"
          type="date"
          title="Дата по"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
        />
        <select
          id="filter_subject"
          name="filter_subject"
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
        >
          <option value="">Все предметы</option>
          <option value="Математика">Математика</option>
        </select>
        <select
          id="filter_tutor_id"
          name="filter_tutor_id"
          value={filters.tutor_id}
          onChange={(e) => setFilters({ ...filters, tutor_id: e.target.value })}
        >
          <option value="">Все педагоги</option>
          {tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.name}</option>)}
        </select>
        <select
          id="filter_lesson_type"
          name="filter_lesson_type"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">Все типы</option>
          <option value="INDIVIDUAL">Индивидуально</option>
          <option value="TRIAL">Пробное</option>
        </select>
        <select
          id="filter_payment_status"
          name="filter_payment_status"
          value={filters.payment_status}
          onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
        >
          <option value="">Оплата</option>
          <option value="PAID">Оплачено</option>
          <option value="PARTIAL">Частично</option>
          <option value="UNPAID">Не оплачено</option>
        </select>
        <button
          type="button"
          onClick={() => setFilters({ date_from: '', date_to: '', tutor_id: '', subject: '', type: '', payment_status: '' })}
        >
          Сбросить фильтры
        </button>
      </div>
      <CalendarGrid
        view={view}
        lessons={lessons}
        tutors={tutors}
        clients={clients}
        onUpdate={load}
        editable={user.role !== 'PARENT'}
        isAdmin={isAdmin}
        onEdit={(lesson) => setActiveModal(lesson)}
        onDelete={handleDeleteLesson}
      />
      {activeModal && (
        <LessonModal
          initialData={activeModal === 'create' ? null : activeModal}
          tutors={tutors}
          clients={clients}
          onClose={() => setActiveModal(null)}
          onSaved={() => { setActiveModal(null); load(); }}
        />
      )}
    </section>
  );
}

function CalendarGrid({
  view,
  lessons,
  tutors,
  clients,
  onUpdate,
  editable,
  isAdmin,
  onEdit,
  onDelete,
}: {
  view: ViewMode;
  lessons: Lesson[];
  tutors: Tutor[];
  clients: Client[];
  onUpdate: () => void;
  editable: boolean;
  isAdmin: boolean;
  onEdit: (lesson: Lesson) => void;
  onDelete: (id: number) => void;
}) {
  const days = useMemo(() => {
    const unique = Array.from(new Set(lessons.map((lesson) => lesson.date))).sort();
    if (view === 'day') return unique.slice(0, 1);
    if (view === 'week') return unique.slice(0, 7);
    return unique.slice(0, 31);
  }, [lessons, view]);
  const hours = Array.from({ length: 13 }, (_, index) => 8 + index);
  const columns = days.length ? days : [new Date().toISOString().slice(0, 10)];

  async function mark(lesson: Lesson, status: LessonStatus, payment_status = lesson.payment_status) {
    await lessonsApi.update(lesson.id, { ...lesson, status, payment_status });
    onUpdate();
  }

  return (
    <div className="calendar-scroll-wrap">
      <div className={`calendar ${view}`}>
        <div className="calendar-head" style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(140px, 1fr))` }}>
          <span />
          {columns.map((day) => <b key={day}>{new Date(day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</b>)}
        </div>
        {hours.map((hour) => (
          <div className="calendar-row" key={hour} style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(140px, 1fr))` }}>
            <time>{hour}:00</time>
            {columns.map((day) => (
              <div className="calendar-cell" key={`${day}-${hour}`}>
                {lessons
                  .filter((lesson) => lesson.date === day && Number(lesson.start_time.slice(0, 2)) === hour)
                  .map((lesson) => {
                    const tutor = tutors.find((item) => item.id === lesson.tutor_id);
                    const client = clients.find((item) => item.id === lesson.client_id);
                    return (
                      <article className={`lesson-card ${lesson.status.toLowerCase()}`} key={lesson.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>{lesson.start_time.slice(0, 5)} {lesson.subject}</strong>
                          {isAdmin && (
                            <div className="table-actions">
                              <button className="action-btn" title="Редактировать" onClick={() => onEdit(lesson)}>
                                <Pencil size={12} />
                              </button>
                              <button className="action-btn danger" title="Удалить" onClick={() => onDelete(lesson.id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        <span>{client?.name || 'Ученик'} · {tutor?.name || 'Педагог'}</span>
                        <small>{lesson.type === 'TRIAL' ? 'Пробное' : 'Индивидуально'} · {lesson.payment_status}</small>
                        {lesson.topic && (
                          <div className="lesson-topic-box">
                            {renderTextWithLinks(lesson.topic)}
                          </div>
                        )}
                        {editable && (
                          <div className="inline-actions">
                            <button onClick={() => mark(lesson, 'DONE')}>Проведено</button>
                            <button onClick={() => mark(lesson, 'CANCELLED')}>Отменено</button>
                            <button onClick={() => mark(lesson, lesson.status, 'PAID')}>Оплачено</button>
                          </div>
                        )}
                      </article>
                    );
                  })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonModal({
  initialData,
  tutors,
  clients,
  onClose,
  onSaved,
}: {
  initialData: Lesson | null;
  tutors: Tutor[];
  clients: Client[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Omit<Lesson, 'id'>>(
    initialData
      ? { ...initialData }
      : emptyLesson
  );
  const [error, setError] = useState('');

  // Lock background scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        tutor_id: Number(form.tutor_id),
        client_id: Number(form.client_id),
        duration_minutes: Number(form.duration_minutes),
      };
      if (initialData) {
        await lessonsApi.update(initialData.id, payload);
      } else {
        await lessonsApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить занятие');
    }
  };

  const canSubmit = Boolean(form.subject.trim()) && Number(form.tutor_id) > 0 && Number(form.client_id) > 0;

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <h2>{initialData ? 'Редактировать занятие' : 'Добавить занятие'}</h2>
          <button type="button" className="close-btn" title="Закрыть" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {!clients.length && <p className="error">Сначала создайте ученика в разделе "Ученики".</p>}
        {!tutors.length && <p className="error">Сначала создайте педагога в разделе "Педагоги".</p>}
        
        <label htmlFor="lesson_form_date">Дата *</label>
        <input
          id="lesson_form_date"
          name="date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
        
        <label htmlFor="lesson_form_start_time">Время начала *</label>
        <input
          id="lesson_form_start_time"
          name="start_time"
          type="time"
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          required
        />
        
        <label htmlFor="lesson_form_duration">Длительность (минут) *</label>
        <input
          id="lesson_form_duration"
          name="duration_minutes"
          type="number"
          value={form.duration_minutes}
          onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
          placeholder="Длительность"
          required
        />
        
        <label htmlFor="lesson_form_subject">Предмет *</label>
        <select
          id="lesson_form_subject"
          name="subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
        >
          <option value="Математика">Математика</option>
          {form.subject && form.subject !== 'Математика' && (
            <option value={form.subject}>{form.subject}</option>
          )}
        </select>

        <label htmlFor="lesson_form_client_id">Ученик *</label>
        <select
          id="lesson_form_client_id"
          name="client_id"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
          required
        >
          <option value={0}>Выберите ученика</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        
        <label htmlFor="lesson_form_tutor_id">Педагог *</label>
        <select
          id="lesson_form_tutor_id"
          name="tutor_id"
          value={form.tutor_id}
          onChange={(e) => setForm({ ...form, tutor_id: Number(e.target.value) })}
          required
        >
          <option value={0}>Выберите педагога</option>
          {tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.name}</option>)}
        </select>
        
        <label htmlFor="lesson_form_type">Тип занятия</label>
        <select
          id="lesson_form_type"
          name="type"
          value={form.type === 'GROUP' ? 'INDIVIDUAL' : form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as LessonType })}
        >
          <option value="INDIVIDUAL">Индивидуально</option>
          <option value="TRIAL">Пробное</option>
        </select>
        
        <label htmlFor="lesson_form_status">Статус</label>
        <select
          id="lesson_form_status"
          name="status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as LessonStatus })}
        >
          <option value="PLANNED">Запланировано</option>
          <option value="DONE">Проведено</option>
          <option value="CANCELLED">Отменено</option>
        </select>

        <label htmlFor="lesson_form_topic">Описание и ссылки на материалы</label>
        <textarea
          id="lesson_form_topic"
          name="topic"
          rows={3}
          value={form.topic || ''}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          placeholder="Заметки к уроку, ссылки на Zoom / онлайн-доску / домашнее задание (https://...)"
        />

        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary" disabled={!canSubmit}>Сохранить</button>
        </div>
      </form>
    </div>
  );
}

function StudentsPage({ user, search }: { user: User; search: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [activeModal, setActiveModal] = useState<'create' | Client | null>(null);

  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

  const load = () => {
    clientsApi.list(search).then(setClients).catch(() => setClients([]));
    if (isAdmin) {
      usersApi.list().then(setUsers).catch(() => setUsers([]));
      tutorsApi.list().then(setTutors).catch(() => setTutors([]));
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  async function handleDelete(id: number) {
    if (!window.confirm('Удалить этого ученика?')) return;
    try {
      await clientsApi.delete(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить ученика');
    }
  }

  const parentsList = useMemo(() => users.filter((u) => u.role === 'PARENT'), [users]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Ученики</h1>
          <p>Карточки учеников, привязка к родительским аккаунтам и педагогам.</p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={() => setActiveModal('create')}>
            <Plus size={18} /> Добавить ученика
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя ученика</th>
              <th>Телефон</th>
              <th>Предмет</th>
              <th>Аккаунт родителя (ЛК)</th>
              <th>Педагог</th>
              {isAdmin && <th>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const parentUser = users.find((u) => u.id === client.parent_id);
              const tutorItem = tutors.find((t) => t.id === client.tutor_id);
              return (
                <tr key={client.id}>
                  <td>{client.id}</td>
                  <td><strong>{client.name}</strong></td>
                  <td>{client.phone || '—'}</td>
                  <td>{client.subject || '—'}</td>
                  <td>
                    {parentUser ? (
                      <span className="account-pill">
                        <UserCheck size={14} color="var(--accent-strong)" />
                        <strong>{parentUser.login}</strong>
                      </span>
                    ) : (
                      <span className="account-pill unlinked">Нет аккаунта</span>
                    )}
                  </td>
                  <td>{tutorItem ? tutorItem.name : client.tutor_id ? `ID ${client.tutor_id}` : '—'}</td>
                  {isAdmin && (
                    <td>
                      <div className="table-actions">
                        <button className="action-btn" title="Редактировать карточку и доступ" onClick={() => setActiveModal(client)}>
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn danger" title="Удалить" onClick={() => handleDelete(client.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {!clients.length && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  Ученики не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeModal && (
        <StudentModal
          initialData={activeModal === 'create' ? null : activeModal}
          parentsList={parentsList}
          tutorsList={tutors}
          onClose={() => setActiveModal(null)}
          onSaved={() => { setActiveModal(null); load(); }}
        />
      )}
    </section>
  );
}

function StudentModal({
  initialData,
  parentsList,
  tutorsList,
  onClose,
  onSaved,
}: {
  initialData: Client | null;
  parentsList: User[];
  tutorsList: Tutor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Omit<Client, 'id'>>(
    initialData
      ? { ...initialData }
      : emptyClient
  );
  
  // Quick parent account creation mode
  const [createAccount, setCreateAccount] = useState(false);
  const [parentFullName, setParentFullName] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [copiedParentCreds, setCopiedParentCreds] = useState(false);
  const [error, setError] = useState('');

  // Password reset for existing parent
  const [resetAccount, setResetAccount] = useState(false);
  const [changeLogin, setChangeLogin] = useState('');
  const [changePassword, setChangePassword] = useState('');

  // Lock background scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const currentParentUser = useMemo(() => parentsList.find((p) => p.id === form.parent_id), [parentsList, form.parent_id]);

  useEffect(() => {
    if (currentParentUser) {
      setChangeLogin(currentParentUser.login);
    }
  }, [currentParentUser]);

  function fillGeneratedPassword() {
    const pass = generateRandomPassword();
    if (createAccount) setNewPassword(pass);
    if (resetAccount) setChangePassword(pass);
  }

  function copyParentCredentials() {
    navigator.clipboard.writeText(`Логин: ${newLogin}\nПароль: ${newPassword}${parentFullName ? `\nФИО: ${parentFullName}` : ''}`);
    setCopiedParentCreds(true);
    setTimeout(() => setCopiedParentCreds(false), 2500);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      let resolvedParentId = form.parent_id ? Number(form.parent_id) : null;

      // If user chose to create a new parent account right now
      if (createAccount) {
        if (!newLogin.trim() || !newPassword.trim()) {
          setError('Заполните логин и пароль для нового аккаунта родителя');
          return;
        }
        const createdUser = await usersApi.create({
          login: newLogin.trim(),
          password: newPassword.trim(),
          role: 'PARENT',
        });
        resolvedParentId = createdUser.id;
      } else if (resetAccount && form.parent_id) {
        // If user changed login or password for existing parent
        await usersApi.update(form.parent_id, {
          login: changeLogin.trim(),
          role: 'PARENT',
          password: changePassword.trim() || undefined,
        });
      }

      const payload = {
        ...form,
        parent_id: resolvedParentId,
        tutor_id: form.tutor_id ? Number(form.tutor_id) : null,
      };

      if (initialData) {
        await clientsApi.update(initialData.id, payload);
      } else {
        await clientsApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <h2>{initialData ? 'Редактировать ученика' : 'Добавить ученика'}</h2>
          <button type="button" className="close-btn" title="Закрыть" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <label htmlFor="student_form_name">Имя ученика *</label>
        <input
          id="student_form_name"
          name="name"
          value={form.name}
          onChange={(e) => {
            const val = e.target.value;
            setForm({ ...form, name: val });
            if (createAccount && !newLogin) {
              setNewLogin(val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '') + '_parent');
            }
          }}
          placeholder="ФИО ученика"
          required
        />

        <label htmlFor="student_form_phone">Телефон</label>
        <input
          id="student_form_phone"
          name="phone"
          value={form.phone || ''}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+7 (999) 000-00-00"
        />

        <label htmlFor="student_form_subject">Предмет</label>
        <select
          id="student_form_subject"
          name="subject"
          value={form.subject || 'Математика'}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        >
          <option value="Математика">Математика</option>
          {form.subject && form.subject !== 'Математика' && (
            <option value={form.subject}>{form.subject}</option>
          )}
        </select>

        <label htmlFor="student_form_tutor_id">Привязанный педагог</label>
        <select
          id="student_form_tutor_id"
          name="tutor_id"
          value={form.tutor_id ?? ''}
          onChange={(e) => setForm({ ...form, tutor_id: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Не выбран</option>
          {tutorsList.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* Section: Parent Account */}
        <div className="sub-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Аккаунт родителя (Доступ в ЛК)</strong>
            {!createAccount && (
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={() => {
                  setCreateAccount(true);
                  if (!newLogin && form.name) {
                    setNewLogin(form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '') + '_parent');
                  }
                  if (!newPassword) fillGeneratedPassword();
                }}
              >
                <Plus size={14} /> Создать новый аккаунт
              </button>
            )}
          </div>

          {!createAccount ? (
            <>
              <label htmlFor="student_form_parent_id">Выбрать существующий аккаунт родителя:</label>
              <select
                id="student_form_parent_id"
                name="parent_id"
                value={form.parent_id ?? ''}
                onChange={(e) => {
                  setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null });
                  setResetAccount(false);
                }}
              >
                <option value="">Без аккаунта</option>
                {parentsList.map((p) => (
                  <option key={p.id} value={p.id}>{p.login} (ID: {p.id})</option>
                ))}
              </select>

              {form.parent_id && !resetAccount && (
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  style={{ justifySelf: 'start' }}
                  onClick={() => setResetAccount(true)}
                >
                  <KeyRound size={14} /> Сменить логин / пароль родителю
                </button>
              )}

              {resetAccount && (
                <div style={{ display: 'grid', gap: '8px', marginTop: '6px' }}>
                  <label htmlFor="parent_change_login">Логин родителя</label>
                  <input
                    id="parent_change_login"
                    name="parent_change_login"
                    value={changeLogin}
                    onChange={(e) => setChangeLogin(e.target.value)}
                    required
                    minLength={3}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="parent_change_password">Новый пароль (мин. 8 символов)</label>
                    <button type="button" className="btn-sm btn-secondary" onClick={fillGeneratedPassword}>
                      <RefreshCw size={12} /> Сгенерировать
                    </button>
                  </div>
                  <input
                    id="parent_change_password"
                    name="parent_change_password"
                    type="password"
                    value={changePassword}
                    onChange={(e) => setChangePassword(e.target.value)}
                    placeholder="Оставьте пустым, если пароль не меняется"
                  />
                  <button
                    type="button"
                    className="btn-sm"
                    style={{ justifySelf: 'start' }}
                    onClick={() => setResetAccount(false)}
                  >
                    Отменить смену данных
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="parent_full_name">ФИО родителя</label>
              <input
                id="parent_full_name"
                name="parent_full_name"
                value={parentFullName}
                onChange={(e) => setParentFullName(e.target.value)}
                placeholder="Имя и Фамилия родителя"
              />

              <label htmlFor="parent_new_login">Логин для родителя *</label>
              <input
                id="parent_new_login"
                name="parent_new_login"
                value={newLogin}
                onChange={(e) => setNewLogin(e.target.value)}
                placeholder="Логин (например: ivanov_parent)"
                required
                minLength={3}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="parent_new_password">Пароль для родителя *</label>
                <button type="button" className="btn-sm btn-secondary" onClick={fillGeneratedPassword}>
                  <RefreshCw size={12} /> Сгенерировать
                </button>
              </div>
              <input
                id="parent_new_password"
                name="parent_new_password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Пароль (мин. 8 символов)"
                required
                minLength={8}
              />

              {newPassword && (
                <div className="credentials-box" style={{ margin: '6px 0 2px 0', padding: '10px' }}>
                  <p style={{ margin: '2px 0' }}>Логин: <strong>{newLogin || '(логин)'}</strong></p>
                  <p style={{ margin: '2px 0' }}>Пароль: <strong>{newPassword}</strong></p>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    onClick={copyParentCredentials}
                    style={{ marginTop: '6px' }}
                  >
                    {copiedParentCreds ? <Check size={14} color="var(--accent-strong)" /> : <Copy size={14} />}
                    {copiedParentCreds ? 'Скопировано в буфер!' : 'Скопировать логин и пароль'}
                  </button>
                </div>
              )}

              <button
                type="button"
                className="btn-sm"
                style={{ justifySelf: 'start' }}
                onClick={() => setCreateAccount(false)}
              >
                Отмена создания аккаунта
              </button>
            </div>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary" disabled={!form.name.trim()}>Сохранить</button>
        </div>
      </form>
    </div>
  );
}

function TutorsPage({ user }: { user: User }) {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeModal, setActiveModal] = useState<'create' | Tutor | null>(null);

  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

  const load = () => {
    tutorsApi.list().then(setTutors).catch(() => setTutors([]));
    if (isAdmin) {
      usersApi.list().then(setUsers).catch(() => setUsers([]));
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: number) {
    if (!window.confirm('Удалить этого педагога?')) return;
    try {
      await tutorsApi.delete(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить педагога');
    }
  }

  const tutorUsersList = useMemo(() => users.filter((u) => u.role === 'TUTOR'), [users]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Педагоги</h1>
          <p>Список преподавателей, их ставки, привязанные аккаунты и статистика.</p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={() => setActiveModal('create')}>
            <Plus size={18} /> Добавить педагога
          </button>
        )}
      </div>

      <div className="tutor-list">
        {tutors.map((tutor) => {
          const linkedUser = users.find((u) => u.id === tutor.user_id);
          return (
            <TutorCard
              key={tutor.id}
              tutor={tutor}
              linkedUser={linkedUser}
              isAdmin={isAdmin}
              onEdit={() => setActiveModal(tutor)}
              onDelete={() => handleDelete(tutor.id)}
            />
          );
        })}
        {!tutors.length && <p style={{ color: 'var(--muted)' }}>Список педагогов пуст.</p>}
      </div>

      {activeModal && (
        <TutorModal
          initialData={activeModal === 'create' ? null : activeModal}
          tutorUsersList={tutorUsersList}
          onClose={() => setActiveModal(null)}
          onSaved={() => { setActiveModal(null); load(); }}
        />
      )}
    </section>
  );
}

function TutorCard({
  tutor,
  linkedUser,
  isAdmin,
  onEdit,
  onDelete,
}: {
  tutor: Tutor;
  linkedUser?: User;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [stats, setStats] = useState<SalaryReportItem | null>(null);

  useEffect(() => {
    tutorsApi.stats(tutor.id).then(setStats).catch(() => setStats(null));
  }, [tutor.id]);

  return (
    <article className="data-card">
      <div className="tutor-card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3>{tutor.name}</h3>
          {linkedUser ? (
            <span className="account-pill" title="Привязан аккаунт входа">
              <UserCheck size={14} color="var(--accent-strong)" />
              ЛК: <strong>{linkedUser.login}</strong>
            </span>
          ) : (
            <span className="account-pill unlinked">Нет аккаунта входа</span>
          )}
        </div>
        {isAdmin && (
          <div className="table-actions">
            <button className="action-btn" title="Редактировать педагога и доступ" onClick={onEdit}>
              <Pencil size={14} />
            </button>
            <button className="action-btn danger" title="Удалить" onClick={onDelete}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <p>{tutor.phone || 'Телефон не указан'} · Telegram: {tutor.telegram || '—'} · WhatsApp: {tutor.whatsapp || '—'}</p>
      <div className="metrics compact">
        <Metric title="Ставка" value={`${tutor.rate_per_hour} ₽/ч`} />
        <Metric title="Занятий" value={stats?.lessons_count ?? 0} />
        <Metric title="Зарплата" value={`${stats?.salary ?? 0} ₽`} />
      </div>
    </article>
  );
}

function TutorModal({
  initialData,
  tutorUsersList,
  onClose,
  onSaved,
}: {
  initialData: Tutor | null;
  tutorUsersList: User[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Omit<Tutor, 'id'>>(
    initialData
      ? { ...initialData }
      : emptyTutor
  );
  
  // Quick account creation mode
  const [createAccount, setCreateAccount] = useState(false);
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [copiedTutorCreds, setCopiedTutorCreds] = useState(false);
  const [error, setError] = useState('');

  // Password reset for existing tutor
  const [resetAccount, setResetAccount] = useState(false);
  const [changeLogin, setChangeLogin] = useState('');
  const [changePassword, setChangePassword] = useState('');

  // Lock background scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const currentTutorUser = useMemo(() => tutorUsersList.find((u) => u.id === form.user_id), [tutorUsersList, form.user_id]);

  useEffect(() => {
    if (currentTutorUser) {
      setChangeLogin(currentTutorUser.login);
    }
  }, [currentTutorUser]);

  function fillGeneratedPassword() {
    const pass = generateRandomPassword();
    if (createAccount) setNewPassword(pass);
    if (resetAccount) setChangePassword(pass);
  }

  function copyTutorCredentials() {
    navigator.clipboard.writeText(`Логин: ${newLogin}\nПароль: ${newPassword}\nФИО: ${form.name}`);
    setCopiedTutorCreds(true);
    setTimeout(() => setCopiedTutorCreds(false), 2500);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      let resolvedUserId = form.user_id ? Number(form.user_id) : null;

      // If user chose to create a new tutor account right now
      if (createAccount) {
        if (!newLogin.trim() || !newPassword.trim()) {
          setError('Заполните логин и пароль для нового аккаунта педагога');
          return;
        }
        const createdUser = await usersApi.create({
          login: newLogin.trim(),
          password: newPassword.trim(),
          role: 'TUTOR',
        });
        resolvedUserId = createdUser.id;
      } else if (resetAccount && form.user_id) {
        // If user changed login or password for existing tutor
        await usersApi.update(form.user_id, {
          login: changeLogin.trim(),
          role: 'TUTOR',
          password: changePassword.trim() || undefined,
        });
      }

      const payload = {
        ...form,
        user_id: resolvedUserId,
      };

      if (initialData) {
        await tutorsApi.update(initialData.id, payload);
      } else {
        await tutorsApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <h2>{initialData ? 'Редактировать педагога' : 'Добавить педагога'}</h2>
          <button type="button" className="close-btn" title="Закрыть" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <label htmlFor="tutor_form_name">ФИО педагога *</label>
        <input
          id="tutor_form_name"
          name="name"
          value={form.name}
          onChange={(e) => {
            const val = e.target.value;
            setForm({ ...form, name: val });
            if (createAccount && !newLogin) {
              setNewLogin(val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '') + '_tutor');
            }
          }}
          placeholder="Имя и Фамилия"
          required
        />

        <label htmlFor="tutor_form_phone">Телефон</label>
        <input
          id="tutor_form_phone"
          name="phone"
          value={form.phone || ''}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+7 (999) 000-00-00"
        />

        <label htmlFor="tutor_form_telegram">Telegram</label>
        <input
          id="tutor_form_telegram"
          name="telegram"
          value={form.telegram || ''}
          onChange={(e) => setForm({ ...form, telegram: e.target.value })}
          placeholder="@username"
        />

        <label htmlFor="tutor_form_whatsapp">WhatsApp</label>
        <input
          id="tutor_form_whatsapp"
          name="whatsapp"
          value={form.whatsapp || ''}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="Номер WhatsApp"
        />

        <label htmlFor="tutor_form_rate">Ставка в час (руб.) *</label>
        <input
          id="tutor_form_rate"
          name="rate_per_hour"
          type="number"
          step="0.01"
          value={form.rate_per_hour}
          onChange={(e) => setForm({ ...form, rate_per_hour: e.target.value })}
          placeholder="1000"
          required
        />

        {/* Section: Tutor Account */}
        <div className="sub-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Личный кабинет педагога (Учётная запись)</strong>
            {!createAccount && (
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={() => {
                  setCreateAccount(true);
                  if (!newLogin && form.name) {
                    setNewLogin(form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '') + '_tutor');
                  }
                  if (!newPassword) fillGeneratedPassword();
                }}
              >
                <Plus size={14} /> Создать новый аккаунт
              </button>
            )}
          </div>

          {!createAccount ? (
            <>
              <label htmlFor="tutor_form_user_id">Привязать к существующему аккаунту:</label>
              <select
                id="tutor_form_user_id"
                name="user_id"
                value={form.user_id ?? ''}
                onChange={(e) => {
                  setForm({ ...form, user_id: e.target.value ? Number(e.target.value) : null });
                  setResetAccount(false);
                }}
              >
                <option value="">Без привязки к аккаунту</option>
                {tutorUsersList.map((u) => (
                  <option key={u.id} value={u.id}>{u.login} (ID: {u.id})</option>
                ))}
              </select>

              {form.user_id && !resetAccount && (
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  style={{ justifySelf: 'start' }}
                  onClick={() => setResetAccount(true)}
                >
                  <KeyRound size={14} /> Сменить логин / пароль педагогу
                </button>
              )}

              {resetAccount && (
                <div style={{ display: 'grid', gap: '8px', marginTop: '6px' }}>
                  <label htmlFor="tutor_change_login">Логин педагога</label>
                  <input
                    id="tutor_change_login"
                    name="tutor_change_login"
                    value={changeLogin}
                    onChange={(e) => setChangeLogin(e.target.value)}
                    required
                    minLength={3}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="tutor_change_password">Новый пароль (мин. 8 символов)</label>
                    <button type="button" className="btn-sm btn-secondary" onClick={fillGeneratedPassword}>
                      <RefreshCw size={12} /> Сгенерировать
                    </button>
                  </div>
                  <input
                    id="tutor_change_password"
                    name="tutor_change_password"
                    type="password"
                    value={changePassword}
                    onChange={(e) => setChangePassword(e.target.value)}
                    placeholder="Оставьте пустым, если пароль не меняется"
                  />
                  <button
                    type="button"
                    className="btn-sm"
                    style={{ justifySelf: 'start' }}
                    onClick={() => setResetAccount(false)}
                  >
                    Отменить смену данных
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="tutor_new_login">Логин для педагога *</label>
              <input
                id="tutor_new_login"
                name="tutor_new_login"
                value={newLogin}
                onChange={(e) => setNewLogin(e.target.value)}
                placeholder="Логин (например: ivanov_tutor)"
                required
                minLength={3}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="tutor_new_password">Пароль для педагога *</label>
                <button type="button" className="btn-sm btn-secondary" onClick={fillGeneratedPassword}>
                  <RefreshCw size={12} /> Сгенерировать
                </button>
              </div>
              <input
                id="tutor_new_password"
                name="tutor_new_password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Пароль (мин. 8 символов)"
                required
                minLength={8}
              />

              {newPassword && (
                <div className="credentials-box" style={{ margin: '6px 0 2px 0', padding: '10px' }}>
                  <p style={{ margin: '2px 0' }}>Логин: <strong>{newLogin || '(логин)'}</strong></p>
                  <p style={{ margin: '2px 0' }}>Пароль: <strong>{newPassword}</strong></p>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    onClick={copyTutorCredentials}
                    style={{ marginTop: '6px' }}
                  >
                    {copiedTutorCreds ? <Check size={14} color="var(--accent-strong)" /> : <Copy size={14} />}
                    {copiedTutorCreds ? 'Скопировано в буфер!' : 'Скопировать логин и пароль'}
                  </button>
                </div>
              )}

              <button
                type="button"
                className="btn-sm"
                style={{ justifySelf: 'start' }}
                onClick={() => setCreateAccount(false)}
              >
                Отмена создания аккаунта
              </button>
            </div>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary" disabled={!form.name.trim()}>Сохранить</button>
        </div>
      </form>
    </div>
  );
}

// ----------------- USERS MANAGEMENT (TUTORS & PARENTS) -----------------
function UsersManagementPage({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TUTOR' | 'PARENT'>('ALL');
  const [activeModal, setActiveModal] = useState<'create' | User | null>(null);

  const load = () => {
    usersApi.list().then((data) => {
      setUsers(data.filter((u) => u.role === 'TUTOR' || u.role === 'PARENT'));
    }).catch(() => setUsers([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(user: User) {
    if (user.id === currentUser.id) {
      alert('Нельзя удалить собственного пользователя');
      return;
    }
    if (!window.confirm(`Удалить аккаунт "${user.login}" (${roleLabel(user.role)})?`)) return;
    try {
      await usersApi.delete(user.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить пользователя');
    }
  }

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'ALL') return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Управление пользователями</h1>
          <p>Выдача логинов и паролей преподавателям и родителям, изменение доступов и сброс паролей.</p>
        </div>
        <button className="primary" onClick={() => setActiveModal('create')}>
          <Plus size={18} /> Выдать доступ новому пользователю
        </button>
      </div>

      <div className="toolbar">
        <Segment<'ALL' | 'TUTOR' | 'PARENT'>
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            ['ALL', `Все (${users.length})`],
            ['TUTOR', `Преподаватели (${users.filter((u) => u.role === 'TUTOR').length})`],
            ['PARENT', `Родители (${users.filter((u) => u.role === 'PARENT').length})`],
          ]}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Логин</th>
              <th>Роль</th>
              <th>Дата создания</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td><strong>{u.login}</strong></td>
                <td><span className={roleBadgeClass(u.role)}>{roleLabel(u.role)}</span></td>
                <td>{new Date(u.created_at).toLocaleString('ru-RU')}</td>
                <td>
                  <div className="table-actions">
                    <button className="action-btn" title="Сменить логин или пароль" onClick={() => setActiveModal(u)}>
                      <Pencil size={14} /> Изменить / Сбросить пароль
                    </button>
                    <button className="action-btn danger" title="Удалить" onClick={() => handleDelete(u)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filteredUsers.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  Пользователи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeModal && (
        <UserAccountModal
          initialData={activeModal === 'create' ? null : activeModal}
          allowedRoles={['TUTOR', 'PARENT']}
          onClose={() => setActiveModal(null)}
          onSaved={() => { setActiveModal(null); load(); }}
        />
      )}
    </section>
  );
}

// ----------------- ADMINS MANAGEMENT (SUPER ADMIN ONLY) -----------------
function AdminsManagementPage({ currentUser }: { currentUser: User }) {
  const [admins, setAdmins] = useState<User[]>([]);
  const [activeModal, setActiveModal] = useState<'create' | User | null>(null);

  const load = () => {
    usersApi.list('ADMIN').then(setAdmins).catch(() => setAdmins([]));
  };

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(admin: User) {
    if (admin.id === currentUser.id) {
      alert('Нельзя удалить собственный аккаунт');
      return;
    }
    if (!window.confirm(`Удалить администратора "${admin.login}"?`)) return;
    try {
      await usersApi.delete(admin.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить администратора');
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Администраторы системы</h1>
          <p>
            👑 Раздел доступен только <strong>Супер Администратору</strong>. Создание администраторов, выдача и сброс логинов и паролей.
          </p>
        </div>
        <button className="primary" onClick={() => setActiveModal('create')}>
          <Plus size={18} /> Добавить администратора
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Логин</th>
              <th>Роль</th>
              <th>Дата создания</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((adm) => (
              <tr key={adm.id}>
                <td>{adm.id}</td>
                <td><strong>{adm.login}</strong></td>
                <td><span className={roleBadgeClass(adm.role)}>{roleLabel(adm.role)}</span></td>
                <td>{new Date(adm.created_at).toLocaleString('ru-RU')}</td>
                <td>
                  <div className="table-actions">
                    <button className="action-btn" title="Сменить логин или пароль" onClick={() => setActiveModal(adm)}>
                      <Pencil size={14} /> Сменить логин / пароль
                    </button>
                    {adm.id !== currentUser.id && (
                      <button className="action-btn danger" title="Удалить администратора" onClick={() => handleDelete(adm)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!admins.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  Администраторы пока не созданы
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeModal && (
        <UserAccountModal
          initialData={activeModal === 'create' ? null : activeModal}
          allowedRoles={['ADMIN']}
          onClose={() => setActiveModal(null)}
          onSaved={() => { setActiveModal(null); load(); }}
        />
      )}
    </section>
  );
}

// ----------------- GENERIC USER ACCOUNT MODAL -----------------
function UserAccountModal({
  initialData,
  allowedRoles,
  onClose,
  onSaved,
}: {
  initialData: User | null;
  allowedRoles: ('ADMIN' | 'TUTOR' | 'PARENT')[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [login, setLogin] = useState(initialData ? initialData.login : '');
  const [role, setRole] = useState<'ADMIN' | 'TUTOR' | 'PARENT'>(
    initialData && allowedRoles.includes(initialData.role as 'ADMIN' | 'TUTOR' | 'PARENT')
      ? (initialData.role as 'ADMIN' | 'TUTOR' | 'PARENT')
      : allowedRoles[0]
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Lock background scroll when modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function fillGeneratedPassword() {
    setPassword(generateRandomPassword());
  }

  function copyCredentials() {
    navigator.clipboard.writeText(`Логин: ${login}\nПароль: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (initialData) {
        await usersApi.update(initialData.id, { login, role, password: password || undefined });
      } else {
        if (!password || password.length < 8) {
          setError('Пароль должен содержать минимум 8 символов');
          return;
        }
        await usersApi.create({ login, role, password });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <h2>{initialData ? `Редактировать ${roleLabel(initialData.role)}` : `Выдать доступ (${roleLabel(role)})`}</h2>
          <button type="button" className="close-btn" title="Закрыть" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <label htmlFor="user_modal_login">Логин *</label>
        <input
          id="user_modal_login"
          name="login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Логин (мин. 3 символа)"
          required
          minLength={3}
        />

        {allowedRoles.length > 1 && (
          <>
            <label htmlFor="user_modal_role">Роль пользователя</label>
            <select
              id="user_modal_role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'TUTOR' | 'PARENT')}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{roleLabel(r)} ({r})</option>
              ))}
            </select>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="user_modal_password">{initialData ? 'Новый пароль' : 'Пароль *'}</label>
          <button type="button" className="btn-sm btn-secondary" onClick={fillGeneratedPassword}>
            <RefreshCw size={12} /> Сгенерировать надёжный пароль
          </button>
        </div>

        <input
          id="user_modal_password"
          name="password"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={initialData ? 'Оставьте пустым, если пароль не меняется' : 'Пароль (мин. 8 символов)'}
          minLength={initialData && !password ? undefined : 8}
          required={!initialData}
        />

        {password && (
          <div className="credentials-box">
            <p><strong>Данные для передачи пользователю:</strong></p>
            <p>Логин: <strong>{login || '(введите логин)'}</strong></p>
            <p>Пароль: <strong>{password}</strong></p>
            <button type="button" className="btn-sm" onClick={copyCredentials} style={{ marginTop: '8px' }}>
              {copied ? <Check size={14} color="var(--accent-strong)" /> : <Copy size={14} />}
              {copied ? 'Скопировано в буфер!' : 'Скопировать логин и пароль'}
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary">Сохранить</button>
        </div>
      </form>
    </div>
  );
}

function ReportsPage() {
  const [salary, setSalary] = useState<SalaryReportItem[]>([]);
  const [lessons, setLessons] = useState<LessonsReport | null>(null);
  useEffect(() => {
    reportsApi.salary().then(setSalary).catch(() => setSalary([]));
    reportsApi.lessons().then(setLessons).catch(() => setLessons(null));
  }, []);
  const conversionRate = lessons ? Number(lessons.trial_conversion_percent).toFixed(1) : '0';
  return (
    <section className="panel">
      <h1>Финансы и отчёты</h1>
      <p>Сводная статистика по занятиям и расчёт зарплат педагогов.</p>
      <div className="metrics">
        <Metric title="Всего занятий" value={lessons?.total ?? 0} />
        <Metric title="Проведено" value={lessons?.done ?? 0} />
        <Metric title="Отменено" value={lessons?.cancelled ?? 0} />
        <Metric title="Конверсия пробных" value={`${conversionRate}%`} />
      </div>
      <Table rows={salary} columns={['tutor_id', 'tutor_name', 'lessons_count', 'minutes', 'hours', 'salary']} />
    </section>
  );
}

function Table<T extends object>({ rows, columns }: { rows: T[]; columns: string[] }) {
  const columnNames: Record<string, string> = {
    tutor_id: 'ID педагога',
    tutor_name: 'Педагог',
    lessons_count: 'Проведено уроков',
    minutes: 'Минут',
    hours: 'Часов',
    salary: 'Зарплата (руб.)',
  };

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{columnNames[column] || column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>{String((row as Record<string, unknown>)[column] ?? '')}</td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                Данные не найдены
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Segment<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: [T, string][] }) {
  return (
    <div className="segment">
      {options.map(([id, title]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{title}</button>)}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function App() {
  return <AppShell />;
}
