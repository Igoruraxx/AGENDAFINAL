import React, { useState } from "react";
import {
  CreditCard,
  Bell,
  BellOff,
  Crown,
  Users,
  Check,
  FlaskConical,
  Shield,
  LogOut,
  Calendar,
  Clock,
  Plus,
  Tag,
  Sparkles,
  QrCode,
  WalletCards,
  PlusCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { PLAN_LIMITS } from "../types";
import { useStudents } from "../hooks/useStudents";
import { useAppointments } from "../hooks/useAppointments";
import { isToday, isTomorrow, isAfter, isSameDay, format } from "date-fns";
// ── Dados mock da assinatura ──
const MOCK_SUBSCRIPTION = {
  startDate: "2025-01-15",
  endDate: "2026-01-15",
  daysRemaining: 326,
  paymentMethod: "Pix",
  value: "R$ 24,99/mês",
};

const PLANS = [
  {
    id: "1m",
    label: "1 mês",
    price: "R$ 24,99",
    perMonth: "R$ 24,99/mês",
    note: "Cobrança mensal",
  },
  {
    id: "3m",
    label: "3 meses",
    price: "R$ 69,90",
    perMonth: "R$ 23,30/mês",
    note: "3x R$ 23,30",
    tag: "7% OFF",
  },
  {
    id: "6m",
    label: "6 meses",
    price: "R$ 129,90",
    perMonth: "R$ 21,65/mês",
    note: "À vista",
    tag: "13% OFF",
    recommended: true,
  },
  {
    id: "12m",
    label: "12 meses",
    price: "R$ 239,90",
    perMonth: "R$ 19,99/mês",
    note: "À vista",
    tag: "20% OFF",
  },
];

const fmt = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

type PaymentMethod = "pix" | "wallet" | "card" | null;

const UserPanel: React.FC = () => {
  const {
    currentUser,
    updateUser,
    isPremium,
    upgradeToPremium,
    downgradeToFree,
    logout,
  } = useAuth();
  const planLimits = PLAN_LIMITS[currentUser.plan];

  const { students } = useStudents();
  const { appointments } = useAppointments();

  const [editingNotifications, setEditingNotifications] = useState(false);

  // Subscription flow state
  const [subExpanded, setSubExpanded] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("6m");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("pix");

  const activeStudentsCount = students.filter((s) => s.isActive).length;
  const monthlyRevenue = students.reduce(
    (acc, s) => acc + (s.isActive ? Number(s.value || 0) : 0),
    0,
  );

  const allAppointments = Object.values(appointments).flat();
  const sessionsDone = allAppointments.filter((a) => a.sessionDone).length;

  const now = new Date();
  const nextAppointments = allAppointments
    .filter(
      (a) => !a.sessionDone && (isSameDay(a.date, now) || isAfter(a.date, now)),
    )
    .sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return a.time.localeCompare(b.time);
    })
    .slice(0, 3)
    .map((a) => ({
      name: a.studentName,
      time: a.time,
      day: isToday(a.date)
        ? "Hoje"
        : isTomorrow(a.date)
          ? "Amanhã"
          : format(a.date, "dd/MM"),
    }));

  const handleNotificationChange = (
    field: keyof typeof currentUser.notifications,
    value: any,
  ) => {
    updateUser({
      notifications: {
        ...currentUser.notifications,
        [field]: value,
      },
    });
  };

  const initials = currentUser.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const sub = MOCK_SUBSCRIPTION;

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)", color: "var(--n-0)" }}
          >
            <span className="text-xl font-extrabold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-medium mb-0.5"
              style={{ color: "var(--n-500)" }}
            >
              {greeting}!
            </p>
            <h2
              className="text-base font-extrabold truncate"
              style={{ color: "var(--n-900)" }}
            >
              {currentUser.name}
            </h2>
            <p className="text-xs truncate" style={{ color: "var(--n-500)" }}>
              {currentUser.email}
            </p>
          </div>
          <span
            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={
              isPremium
                ? {
                    background: "var(--warning-light)",
                    color: "var(--warning)",
                    border: "1px solid var(--warning)",
                  }
                : {
                    background: "var(--n-100)",
                    color: "var(--n-500)",
                    border: "1px solid var(--n-200)",
                  }
            }
          >
            {isPremium && <Crown size={11} />}
            {isPremium ? "Premium" : "Gratuito"}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Clientes",
              value: activeStudentsCount,
              color: "var(--accent)",
            },
            {
              label: "Receita",
              value: `R$${monthlyRevenue}`,
              color: "var(--success)",
            },
            { label: "Sessões", value: sessionsDone, color: "#8b5cf6" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-2.5 text-center"
              style={{
                background: "var(--n-0)",
                border: "1px solid var(--n-200)",
              }}
            >
              <div
                className="text-lg font-extrabold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: "var(--n-500)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Next Appointments */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--n-0)", border: "1px solid var(--n-200)" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: "var(--accent-light)" }}
            >
              <Users size={16} style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--n-900)" }}>
              Próximos Atendimentos
            </h3>
          </div>
          <div className="space-y-0">
            {nextAppointments.map((apt, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 last:border-0"
                style={{ borderBottom: "1px solid var(--n-100)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--accent)", color: "var(--n-0)" }}
                  >
                    <span className="text-xs font-bold">
                      {apt.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "var(--n-900)" }}
                    >
                      {apt.name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--n-500)" }}>
                      {apt.day} às {apt.time}
                    </div>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={
                    apt.day === "Hoje"
                      ? {
                          background: "var(--accent-light)",
                          color: "var(--accent)",
                        }
                      : { background: "var(--n-100)", color: "var(--n-500)" }
                  }
                >
                  {apt.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
          ASSINATURA — Estrutura unificada e simples
          ═══════════════════════════════════════════════ */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--n-200)", background: "var(--n-0)" }}
        >
          {/* Plan Header */}
          {isPremium ? (
            <div
              className="relative overflow-hidden px-4 py-4"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-dark))",
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Crown size={20} style={{ color: "#fff" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Plano Premium
                    </h3>
                    <p
                      className="text-xs font-medium"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    >
                      Todos os recursos ativos
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
                >
                  <Sparkles size={10} />
                  Ativo
                </div>
              </div>
            </div>
          ) : (
            <div
              className="px-4 py-4 flex items-center justify-between"
              style={{
                background: "var(--n-50)",
                borderBottom: "1px solid var(--n-200)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl"
                  style={{ background: "var(--n-200)" }}
                >
                  <CreditCard size={18} style={{ color: "var(--n-500)" }} />
                </div>
                <div>
                  <h3
                    className="text-sm font-extrabold"
                    style={{ color: "var(--n-900)" }}
                  >
                    Plano Gratuito
                  </h3>
                  <p className="text-xs" style={{ color: "var(--n-500)" }}>
                    Recursos limitados
                  </p>
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--n-200)", color: "var(--n-500)" }}
              >
                Free
              </span>
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* Client usage bar */}
            <div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span
                  className="flex items-center gap-1.5"
                  style={{ color: "var(--n-500)" }}
                >
                  <Users size={13} />
                  Clientes ativos
                </span>
                <span
                  className="font-extrabold text-sm"
                  style={{
                    color: isPremium ? "var(--accent)" : "var(--n-900)",
                  }}
                >
                  {activeStudentsCount} /{" "}
                  {isPremium ? "∞" : planLimits.maxStudents}
                </span>
              </div>
              <div
                className="w-full rounded-full h-2.5"
                style={{ background: "var(--n-100)" }}
              >
                <div
                  className="h-2.5 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: isPremium
                      ? "100%"
                      : `${Math.min((activeStudentsCount / planLimits.maxStudents) * 100, 100)}%`,
                    background: isPremium
                      ? "linear-gradient(90deg, var(--accent), var(--accent-dark))"
                      : activeStudentsCount / planLimits.maxStudents >= 0.8
                        ? "linear-gradient(90deg, var(--warning), var(--error))"
                        : "linear-gradient(90deg, var(--accent), var(--accent-dark))",
                  }}
                />
              </div>
              {!isPremium && activeStudentsCount >= planLimits.maxStudents && (
                <p
                  className="text-[11px] mt-1.5 font-medium"
                  style={{ color: "var(--warning)" }}
                >
                  Limite atingido — faça upgrade para adicionar mais
                </p>
              )}
            </div>

            {/* ── 1. Minha Assinatura (datas) ── */}
            {isPremium && (
              <div
                className="rounded-xl"
                style={{ border: "1px solid var(--n-200)", overflow: "hidden" }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--n-100)" }}
                >
                  <Calendar size={15} style={{ color: "var(--accent)" }} />
                  <span
                    className="text-sm font-bold"
                    style={{ color: "var(--n-900)" }}
                  >
                    Minha Assinatura
                  </span>
                </div>
                <div
                  className="grid grid-cols-2 divide-x"
                  style={{ borderBottom: "1px solid var(--n-100)" }}
                >
                  <div className="px-4 py-3">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                      style={{ color: "var(--n-400)" }}
                    >
                      Início
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "var(--n-900)" }}
                    >
                      {fmt(sub.startDate)}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                      style={{ color: "var(--n-400)" }}
                    >
                      Término
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "var(--n-900)" }}
                    >
                      {fmt(sub.endDate)}
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={13} style={{ color: "var(--accent)" }} />
                    <span className="text-xs" style={{ color: "var(--n-500)" }}>
                      Tempo restante
                    </span>
                  </div>
                  <span
                    className="text-sm font-extrabold"
                    style={{
                      color:
                        sub.daysRemaining <= 30
                          ? "var(--warning)"
                          : "var(--accent)",
                    }}
                  >
                    {sub.daysRemaining} dias
                  </span>
                </div>
              </div>
            )}

            {/* ── 2. Adicionar Dias / Upgrade CTA ── */}
            {isPremium ? (
              <button
                onClick={() => setSubExpanded(!subExpanded)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all active:scale-[0.98]"
                style={{
                  background: "var(--success-light)",
                  color: "var(--success)",
                  border: "1px solid rgba(22,163,74,0.15)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Plus size={18} />
                  <span className="text-sm font-bold">
                    Adicionar mais tempo
                  </span>
                </div>
                {subExpanded ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
            ) : (
              <button
                onClick={() => setSubExpanded(!subExpanded)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.2)" }}
                  >
                    <Crown size={16} style={{ color: "#fff" }} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">
                      Upgrade para Premium
                    </div>
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    >
                      A partir de R$ 19,99/mês
                    </div>
                  </div>
                </div>
                {subExpanded ? (
                  <ChevronUp
                    size={18}
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  />
                ) : (
                  <ChevronDown
                    size={18}
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  />
                )}
              </button>
            )}

            {/* ── 3. Planos + Pagamento (expandível) ── */}
            {subExpanded && (
              <div className="space-y-4 animate-fade-in-up">
                {/* Planos disponíveis */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} style={{ color: "var(--accent)" }} />
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: "var(--n-500)" }}
                    >
                      Escolha o plano
                    </span>
                  </div>
                  <div className="space-y-2">
                    {PLANS.map((plan) => {
                      const isSelected = selectedPlan === plan.id;
                      return (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className="w-full rounded-xl p-3.5 text-left transition-all relative overflow-hidden"
                          style={{
                            background: isSelected
                              ? "var(--accent-light)"
                              : "var(--n-0)",
                            border: isSelected
                              ? "2px solid var(--accent)"
                              : "1.5px solid var(--n-200)",
                            boxShadow: isSelected
                              ? "0 0 0 3px rgba(37,99,235,0.08)"
                              : "none",
                          }}
                        >
                          {plan.recommended && (
                            <div
                              className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold rounded-bl-lg"
                              style={{
                                background: "var(--accent)",
                                color: "#fff",
                              }}
                            >
                              MELHOR
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  border: isSelected
                                    ? "2px solid var(--accent)"
                                    : "2px solid var(--n-300)",
                                  background: isSelected
                                    ? "var(--accent)"
                                    : "transparent",
                                }}
                              >
                                {isSelected && (
                                  <Check
                                    size={11}
                                    style={{ color: "#fff" }}
                                    strokeWidth={3}
                                  />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-sm font-bold"
                                    style={{ color: "var(--n-900)" }}
                                  >
                                    {plan.label}
                                  </span>
                                  {plan.tag && (
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"
                                      style={{
                                        background: "var(--success-light)",
                                        color: "var(--success)",
                                      }}
                                    >
                                      <Tag size={8} /> {plan.tag}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="text-[11px] mt-0.5"
                                  style={{ color: "var(--n-500)" }}
                                >
                                  {plan.perMonth} · {plan.note}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div
                                className="text-base font-extrabold"
                                style={{
                                  color: isSelected
                                    ? "var(--accent)"
                                    : "var(--n-900)",
                                }}
                              >
                                {plan.price}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Forma de pagamento */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={14} style={{ color: "var(--accent)" }} />
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: "var(--n-500)" }}
                    >
                      Forma de pagamento
                    </span>
                  </div>
                  <div className="space-y-2">
                    {/* Pix */}
                    <button
                      onClick={() => setSelectedPayment("pix")}
                      className="w-full rounded-xl p-3 text-left transition-all flex items-center gap-3"
                      style={{
                        background:
                          selectedPayment === "pix"
                            ? "var(--accent-light)"
                            : "var(--n-0)",
                        border:
                          selectedPayment === "pix"
                            ? "2px solid var(--accent)"
                            : "1.5px solid var(--n-200)",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            selectedPayment === "pix"
                              ? "var(--accent)"
                              : "var(--n-100)",
                        }}
                      >
                        <QrCode
                          size={16}
                          style={{
                            color:
                              selectedPayment === "pix"
                                ? "#fff"
                                : "var(--n-500)",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-bold"
                            style={{ color: "var(--n-900)" }}
                          >
                            Pix
                          </span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: "var(--success-light)",
                              color: "var(--success)",
                            }}
                          >
                            Instantâneo
                          </span>
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--n-500)" }}
                        >
                          Aprovação imediata · Sem taxas
                        </div>
                      </div>
                      {selectedPayment === "pix" && (
                        <CheckCircle
                          size={18}
                          style={{ color: "var(--accent)" }}
                          className="flex-shrink-0"
                        />
                      )}
                    </button>

                    {/* Carteira */}
                    <button
                      onClick={() => setSelectedPayment("wallet")}
                      className="w-full rounded-xl p-3 text-left transition-all flex items-center gap-3"
                      style={{
                        background:
                          selectedPayment === "wallet"
                            ? "var(--accent-light)"
                            : "var(--n-0)",
                        border:
                          selectedPayment === "wallet"
                            ? "2px solid var(--accent)"
                            : "1.5px solid var(--n-200)",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            selectedPayment === "wallet"
                              ? "var(--accent)"
                              : "var(--n-100)",
                        }}
                      >
                        <WalletCards
                          size={16}
                          style={{
                            color:
                              selectedPayment === "wallet"
                                ? "#fff"
                                : "var(--n-500)",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-sm font-bold"
                          style={{ color: "var(--n-900)" }}
                        >
                          Carteira FitPro
                        </span>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--n-500)" }}
                        >
                          Saldo:{" "}
                          <strong style={{ color: "var(--accent)" }}>
                            R$ 0,00
                          </strong>
                        </div>
                      </div>
                      {selectedPayment === "wallet" && (
                        <CheckCircle
                          size={18}
                          style={{ color: "var(--accent)" }}
                          className="flex-shrink-0"
                        />
                      )}
                    </button>

                    {/* Adicionar cartão */}
                    <button
                      onClick={() => setSelectedPayment("card")}
                      className="w-full rounded-xl p-3 text-left transition-all flex items-center gap-3"
                      style={{
                        background:
                          selectedPayment === "card"
                            ? "var(--accent-light)"
                            : "var(--n-0)",
                        border:
                          selectedPayment === "card"
                            ? "2px solid var(--accent)"
                            : "1.5px dashed var(--n-300)",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            selectedPayment === "card"
                              ? "var(--accent)"
                              : "var(--n-100)",
                        }}
                      >
                        <PlusCircle
                          size={16}
                          style={{
                            color:
                              selectedPayment === "card"
                                ? "#fff"
                                : "var(--n-400)",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--n-700)" }}
                        >
                          Cartão de crédito
                        </span>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--n-400)" }}
                        >
                          Visa, Mastercard, Elo
                        </div>
                      </div>
                      {selectedPayment === "card" && (
                        <CheckCircle
                          size={18}
                          style={{ color: "var(--accent)" }}
                          className="flex-shrink-0"
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* CTA Confirmar */}
                <button
                  className="btn btn-primary w-full py-3.5 text-sm font-extrabold"
                  disabled={!selectedPayment}
                >
                  {isPremium ? "Confirmar renovação" : "Assinar Premium agora"}
                </button>
                <div className="flex items-center justify-center gap-1.5">
                  <Shield size={11} style={{ color: "var(--n-400)" }} />
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--n-400)" }}
                  >
                    Pagamento 100% seguro · Cancele quando quiser
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--n-0)", border: "1px solid var(--n-200)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-lg"
                style={{ background: "var(--warning-light)" }}
              >
                {currentUser.notifications.enabled ? (
                  <Bell size={18} style={{ color: "var(--warning)" }} />
                ) : (
                  <BellOff size={18} style={{ color: "var(--n-400)" }} />
                )}
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: "var(--n-900)" }}
              >
                Notificações
              </h3>
            </div>
            <button
              onClick={() => setEditingNotifications(!editingNotifications)}
              className="text-xs font-semibold transition-colors touch-manipulation px-2 py-1"
              style={{ color: "var(--accent)" }}
            >
              {editingNotifications ? "Cancelar" : "Editar"}
            </button>
          </div>

          {!editingNotifications ? (
            <div className="space-y-2">
              {[
                {
                  label: "Status",
                  value: currentUser.notifications.enabled
                    ? "Ativas"
                    : "Inativas",
                  highlight: currentUser.notifications.enabled,
                },
                ...(currentUser.notifications.enabled
                  ? [
                      {
                        label: "Notificar 15min antes",
                        value: currentUser.notifications.notifyBefore
                          ? "Sim"
                          : "Não",
                        highlight: currentUser.notifications.notifyBefore,
                      },
                      {
                        label: "Notificar na hora",
                        value: currentUser.notifications.notifyAtTime
                          ? "Sim"
                          : "Não",
                        highlight: currentUser.notifications.notifyAtTime,
                      },
                      {
                        label: "Listagem diária",
                        value: currentUser.notifications.dailyListTime,
                        highlight: true,
                      },
                    ]
                  : []),
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1.5 last:border-0"
                  style={{ borderBottom: "1px solid var(--n-100)" }}
                >
                  <span style={{ color: "var(--n-500)" }}>{item.label}</span>
                  <span
                    className="font-semibold"
                    style={{
                      color: item.highlight ? "var(--success)" : "var(--n-400)",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                {
                  label: "Ativar notificações",
                  field: "enabled" as const,
                  value: currentUser.notifications.enabled,
                },
                ...(currentUser.notifications.enabled
                  ? [
                      {
                        label: "Notificar 15min antes",
                        field: "notifyBefore" as const,
                        value: currentUser.notifications.notifyBefore,
                      },
                      {
                        label: "Notificar na hora",
                        field: "notifyAtTime" as const,
                        value: currentUser.notifications.notifyAtTime,
                      },
                    ]
                  : []),
              ].map((item) => (
                <label
                  key={item.field}
                  className="flex items-center justify-between cursor-pointer py-1"
                >
                  <span className="text-sm" style={{ color: "var(--n-700)" }}>
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) =>
                      handleNotificationChange(item.field, e.target.checked)
                    }
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                </label>
              ))}

              {currentUser.notifications.enabled && (
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: "var(--n-600)" }}
                  >
                    Listagem diária às
                  </label>
                  <input
                    type="time"
                    value={currentUser.notifications.dailyListTime}
                    onChange={(e) =>
                      handleNotificationChange("dailyListTime", e.target.value)
                    }
                    className="input-base"
                  />
                </div>
              )}

              <button
                onClick={() => setEditingNotifications(false)}
                className="btn btn-primary w-full py-2.5 text-sm font-bold mt-1"
              >
                Salvar
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all touch-manipulation"
          style={{ border: "1px solid var(--n-200)", color: "var(--error)" }}
        >
          <LogOut size={15} />
          Sair da conta
        </button>

        {/* Dev Tools */}
        {currentUser?.isAdmin && (
          <div
            className="rounded-xl p-4"
            style={{
              border: "1px dashed var(--n-300)",
              background: "var(--n-50)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={15} style={{ color: "var(--n-400)" }} />
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--n-400)" }}
              >
                Dev — Simular plano
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downgradeToFree()}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all touch-manipulation"
                style={
                  !isPremium && !currentUser.isAdmin
                    ? { background: "var(--accent)", color: "var(--n-0)" }
                    : {
                        background: "var(--n-100)",
                        color: "var(--n-500)",
                        border: "1px solid var(--n-200)",
                      }
                }
              >
                Gratuito
              </button>
              <button
                onClick={() => upgradeToPremium()}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all touch-manipulation"
                style={
                  isPremium && !currentUser.isAdmin
                    ? { background: "#8b5cf6", color: "var(--n-0)" }
                    : {
                        background: "var(--n-100)",
                        color: "var(--n-500)",
                        border: "1px solid var(--n-200)",
                      }
                }
              >
                <Crown size={11} className="inline mr-1" />
                Premium
              </button>
              <button
                onClick={() => updateUser({ isAdmin: !currentUser.isAdmin })}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all touch-manipulation"
                style={
                  currentUser.isAdmin
                    ? { background: "var(--error)", color: "var(--n-0)" }
                    : {
                        background: "var(--n-100)",
                        color: "var(--n-500)",
                        border: "1px solid var(--n-200)",
                      }
                }
              >
                <Shield size={11} className="inline mr-1" />
                Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPanel;
