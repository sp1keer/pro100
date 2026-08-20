import { CalendarDays, Filter, GraduationCap, LayoutDashboard, LogOut, Pencil, Plus, Search, SlidersHorizontal, Trash2, UserRound, Users } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { authApi, clientsApi, lessonsApi, reportsApi, tokenStore, tutorsApi, usersApi } from './api';
import type { Client, Lesson, LessonsReport, LessonStatus, LessonType, Role, SalaryReportItem, Tutor, User } from './types';

type Page = 'profile' | 'lessons' | 'clients' | 'tutors' | 'admin' | 'reports';
type ViewMode = 'day' | 'week' | 'month';

const emptyLesson: Omit<Lesson, 'id'> = {
  type: 'INDIVIDUAL',
  date: new Date().toISOString().slice(0, 10),
  start_time: '10:00',
  duration_minutes: 60,
  classroom: '',
  subject: '',
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
  subject: '',
};

function AppShell() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('lessons');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="screen-center">Загрузка...</div>;
  if (!user) return <Login onLogin={setUser} />;

  const nav = [
    { id: 'profile' as const, title: 'Мой профиль', icon: UserRound },
    { id: 'lessons' as const, title: 'Уроки', icon: CalendarDays },
    { id: 'clients' as const, title: 'Клиенты', icon: Users },
    { id: 'tutors' as const, title: 'Педагоги', icon: GraduationCap },
    { id: 'reports' as const, title: 'Отчёты', icon: LayoutDashboard, adminOnly: true },
    { id: 'admin' as const, title: 'Админка', icon: SlidersHorizontal, adminOnly: true },
  ].filter((item) => !item.adminOnly || user.role === 'ADMIN');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>p100</span> pro100_repik</div>
        <nav>
          {nav.map((item) => (
            <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>
              <item.icon size={18} />
              {item.title}
            </button>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <label className="search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" />
          </label>
          <div className="profile-chip">
            <span>{user.login}</span>
            <b>{user.role}</b>
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
          {page === 'clients' && <ClientsPage user={user} search={query} />}
          {page === 'tutors' && <TutorsPage user={user} />}
          {page === 'reports' && <ReportsPage />}
          {page === 'admin' && <AdminPage currentUser={user} />}
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
        <input value={login} onChange={(event) => setLogin(event.target.value)} placeholder="Логин" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" />
        {error && <p className="error">{error}</p>}
        <button className="primary">Войти</button>
      </form>
    </div>
  );
}

function Profile({ user }: { user: User }) {
  return (
    <section className="panel">
      <h1>Мой профиль</h1>
      <div className="metrics">
        <Metric title="Логин" value={user.login} />
        <Metric title="Роль" value={user.role} />
        <Metric title="Создан" value={new Date(user.created_at).toLocaleDateString('ru-RU')} />
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

  const load = () => {
    lessonsApi.list(filters).then(setLessons).catch(() => setLessons([]));
    tutorsApi.list().then(setTutors).catch(() => setTutors([]));
    clientsApi.list().then(setClients).catch(() => setClients([]));
  };

  useEffect(() => {
    load();
  }, []);

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
          <p>Сетка 08:00-20:00, фильтры, статусы и управление уроками.</p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="primary" onClick={() => setActiveModal('create')}>
            <Plus size={18} /> Добавить занятие
          </button>
        )}
      </div>
      <div className="toolbar">
        <Segment<ViewMode> value={view} onChange={setView} options={[['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц']]} />
        <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
        <input placeholder="Предмет" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} />
        <select value={filters.tutor_id} onChange={(e) => setFilters({ ...filters, tutor_id: e.target.value })}>
          <option value="">Педагог</option>
          {tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.name}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">Тип</option>
          <option value="GROUP">Группа</option>
          <option value="INDIVIDUAL">Индивидуально</option>
          <option value="TRIAL">Пробное</option>
        </select>
        <select value={filters.payment_status} onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}>
          <option value="">Оплата</option>
          <option value="PAID">Оплачено</option>
          <option value="PARTIAL">Частично</option>
          <option value="UNPAID">Не оплачено</option>
        </select>
        <button onClick={load}><Filter size={16} /> Фильтр</button>
        <button onClick={() => setFilters({ date_from: '', date_to: '', tutor_id: '', subject: '', type: '', payment_status: '' })}>
          Сбросить
        </button>
      </div>
      <CalendarGrid
        view={view}
        lessons={lessons}
        tutors={tutors}
        clients={clients}
        onUpdate={load}
        editable={user.role !== 'PARENT'}
        isAdmin={user.role === 'ADMIN'}
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
    <div className={`calendar ${view}`}>
      <div className="calendar-head" style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(130px, 1fr))` }}>
        <span />
        {columns.map((day) => <b key={day}>{new Date(day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}</b>)}
      </div>
      {hours.map((hour) => (
        <div className="calendar-row" key={hour} style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(130px, 1fr))` }}>
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
                      <span>{client?.name || 'Клиент'} · {tutor?.name || 'Педагог'}</span>
                      <small>{lesson.type} · {lesson.payment_status}</small>
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
        <h2>{initialData ? 'Редактировать занятие' : 'Добавить занятие'}</h2>
        {!clients.length && <p className="error">Сначала создайте клиента в разделе "Клиенты".</p>}
        {!tutors.length && <p className="error">Сначала создайте педагога в разделе "Педагоги".</p>}
        
        <label>Дата</label>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        
        <label>Время начала</label>
        <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
        
        <label>Длительность (минут)</label>
        <input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} placeholder="Длительность" required />
        
        <label>Аудитория</label>
        <input value={form.classroom || ''} onChange={(e) => setForm({ ...form, classroom: e.target.value })} placeholder="Аудитория" />
        
        <label>Предмет *</label>
        <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Предмет" required />
        
        <label>Тема</label>
        <input value={form.topic || ''} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Тема" />
        
        <label>Клиент *</label>
        <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })} required>
          <option value={0}>Выберите клиента</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        
        <label>Педагог *</label>
        <select value={form.tutor_id} onChange={(e) => setForm({ ...form, tutor_id: Number(e.target.value) })} required>
          <option value={0}>Выберите педагога</option>
          {tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.name}</option>)}
        </select>
        
        <label>Тип занятия</label>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LessonType })}>
          <option value="INDIVIDUAL">Индивидуально</option>
          <option value="GROUP">Группа</option>
          <option value="TRIAL">Пробное</option>
        </select>
        
        <label>Статус</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LessonStatus })}>
          <option value="PLANNED">Запланировано</option>
          <option value="DONE">Проведено</option>
          <option value="CANCELLED">Отменено</option>
        </select>

        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary" disabled={!canSubmit}>Сохранить</button>
        </div>
      </form>
    </div>
  );
}

function ClientsPage({ user, search }: { user: User; search: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [activeModal, setActiveModal] = useState<'create' | Client | null>(null);

  const load = () => {
    clientsApi.list(search).then(setClients).catch(() => setClients([]));
    if (user.role === 'ADMIN') {
      usersApi.list().then(setUsers).catch(() => setUsers([]));
      tutorsApi.list().then(setTutors).catch(() => setTutors([]));
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  async function handleDelete(id: number) {
    if (!window.confirm('Удалить этого клиента?')) return;
    try {
      await clientsApi.delete(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить клиента');
    }
  }

  const parentsList = useMemo(() => users.filter((u) => u.role === 'PARENT' || u.role === 'ADMIN'), [users]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Клиенты</h1>
          <p>Управление карточками учеников и клиентов.</p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="primary" onClick={() => setActiveModal('create')}>
            <Plus size={18} /> Добавить клиента
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>Телефон</th>
              <th>Предмет</th>
              <th>Родитель</th>
              <th>Педагог</th>
              {user.role === 'ADMIN' && <th>Действия</th>}
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
                  <td>{parentUser ? parentUser.login : client.parent_id ? `ID ${client.parent_id}` : '—'}</td>
                  <td>{tutorItem ? tutorItem.name : client.tutor_id ? `ID ${client.tutor_id}` : '—'}</td>
                  {user.role === 'ADMIN' && (
                    <td>
                      <div className="table-actions">
                        <button className="action-btn" title="Редактировать" onClick={() => setActiveModal(client)}>
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
                <td colSpan={user.role === 'ADMIN' ? 7 : 6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  Клиенты не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeModal && (
        <ClientModal
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

function ClientModal({
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
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
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
        <h2>{initialData ? 'Редактировать клиента' : 'Добавить клиента'}</h2>

        <label>Имя клиента *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ФИО клиента" required />

        <label>Телефон</label>
        <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (999) 000-00-00" />

        <label>Предмет</label>
        <input value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Например: Математика" />

        <label>Родитель (Аккаунт)</label>
        <select value={form.parent_id ?? ''} onChange={(e) => setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Не выбран</option>
          {parentsList.map((p) => (
            <option key={p.id} value={p.id}>{p.login} ({p.role})</option>
          ))}
        </select>

        <label>Привязанный педагог</label>
        <select value={form.tutor_id ?? ''} onChange={(e) => setForm({ ...form, tutor_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Не выбран</option>
          {tutorsList.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

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

  const load = () => {
    tutorsApi.list().then(setTutors).catch(() => setTutors([]));
    if (user.role === 'ADMIN') {
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

  const tutorUsersList = useMemo(() => users.filter((u) => u.role === 'TUTOR' || u.role === 'ADMIN'), [users]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Педагоги</h1>
          <p>Список преподавателей, их ставки и связанные данные.</p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="primary" onClick={() => setActiveModal('create')}>
            <Plus size={18} /> Добавить педагога
          </button>
        )}
      </div>

      <div className="tutor-list">
        {tutors.map((tutor) => (
          <TutorCard
            key={tutor.id}
            tutor={tutor}
            isAdmin={user.role === 'ADMIN'}
            onEdit={() => setActiveModal(tutor)}
            onDelete={() => handleDelete(tutor.id)}
          />
        ))}
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
  isAdmin,
  onEdit,
  onDelete,
}: {
  tutor: Tutor;
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
        <h3>{tutor.name}</h3>
        {isAdmin && (
          <div className="table-actions">
            <button className="action-btn" title="Редактировать" onClick={onEdit}>
              <Pencil size={14} />
            </button>
            <button className="action-btn danger" title="Удалить" onClick={onDelete}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <p>{tutor.phone || 'Телефон не указан'} · {tutor.telegram || 'Telegram не указан'}</p>
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
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        user_id: form.user_id ? Number(form.user_id) : null,
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
        <h2>{initialData ? 'Редактировать педагога' : 'Добавить педагога'}</h2>

        <label>ФИО педагога *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Имя и Фамилия" required />

        <label>Телефон</label>
        <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (999) 000-00-00" />

        <label>Telegram</label>
        <input value={form.telegram || ''} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="@username" />

        <label>WhatsApp</label>
        <input value={form.whatsapp || ''} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="Номер WhatsApp" />

        <label>Ставка в час (руб.) *</label>
        <input
          type="number"
          step="0.01"
          value={form.rate_per_hour}
          onChange={(e) => setForm({ ...form, rate_per_hour: e.target.value })}
          placeholder="1000"
          required
        />

        <label>Привязать к аккаунту пользователя</label>
        <select value={form.user_id ?? ''} onChange={(e) => setForm({ ...form, user_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Без привязки к аккаунту</option>
          {tutorUsersList.map((u) => (
            <option key={u.id} value={u.id}>{u.login} ({u.role})</option>
          ))}
        </select>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Отмена</button>
          <button className="primary" disabled={!form.name.trim()}>Сохранить</button>
        </div>
      </form>
    </div>
  );
}

function AdminPage({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [activeModal, setActiveModal] = useState<'create' | User | null>(null);

  const load = () => usersApi.list().then(setUsers).catch(() => setUsers([]));

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(user: User) {
    if (user.id === currentUser.id) {
      alert('Нельзя удалить собственного пользователя');
      return;
    }
    if (!window.confirm(`Удалить пользователя "${user.login}"?`)) return;
    try {
      await usersApi.delete(user.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить пользователя');
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h1>Админка — Управление пользователями</h1>
          <p>Создание, редактирование ролей, сброс паролей и удаление аккаунтов.</p>
        </div>
        <button className="primary" onClick={() => setActiveModal('create')}>
          <Plus size={18} /> Создать пользователя
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
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td><strong>{user.login}</strong></td>
                <td><b style={{ color: 'var(--accent-strong)' }}>{user.role}</b></td>
                <td>{new Date(user.created_at).toLocaleString('ru-RU')}</td>
                <td>
                  <div className="table-actions">
                    <button className="action-btn" title="Редактировать" onClick={() => setActiveModal(user)}>
                      <Pencil size={14} />
                    </button>
                    {user.id !== currentUser.id && (
                      <button className="action-btn danger" title="Удалить" onClick={() => handleDelete(user)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeModal && (
        <UserModal
          initialData={activeModal === 'create' ? null : activeModal}
          onClose={() => setActiveModal(null)}
          onSaved={() => { setActiveModal(null); load(); }}
        />
      )}
    </section>
  );
}

function UserModal({
  initialData,
  onClose,
  onSaved,
}: {
  initialData: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [login, setLogin] = useState(initialData ? initialData.login : '');
  const [role, setRole] = useState<Role>(initialData ? initialData.role : 'TUTOR');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
        <h2>{initialData ? 'Редактировать пользователя' : 'Создать пользователя'}</h2>

        <label>Логин *</label>
        <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин (мин. 3 символа)" required minLength={3} />

        <label>Роль</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="ADMIN">ADMIN</option>
          <option value="TUTOR">TUTOR</option>
          <option value="PARENT">PARENT</option>
        </select>

        <label>{initialData ? 'Новый пароль (оставьте пустым, если не меняете)' : 'Пароль *'}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={initialData ? '••••••••' : 'Пароль (мин. 8 символов)'}
          minLength={initialData && !password ? undefined : 8}
          required={!initialData}
        />

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
      <div className="metrics">
        <Metric title="Всего занятий" value={lessons?.total ?? 0} />
        <Metric title="Проведено" value={lessons?.done ?? 0} />
        <Metric title="Отменено" value={lessons?.cancelled ?? 0} />
        <Metric title="Trial conversion" value={`${conversionRate}%`} />
      </div>
      <Table rows={salary} columns={['tutor_id', 'tutor_name', 'lessons_count', 'minutes', 'hours', 'salary']} />
    </section>
  );
}

function Table<T extends object>({ rows, columns }: { rows: T[]; columns: string[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{columns.map((column) => <td key={column}>{String((row as Record<string, unknown>)[column] ?? '')}</td>)}</tr>
          ))}
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
