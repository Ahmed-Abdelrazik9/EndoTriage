import { Link } from "wouter";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  useGetTriageBreakdown,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TriageBadge from "@/components/TriageBadge";
import { timeAgo } from "@/lib/triage";
import {
  Users, AlertTriangle, ClipboardList, Activity,
  UserPlus, ChevronRight, Stethoscope
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend
} from "recharts";

const LEVEL_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
const STAGE_COLORS_CHART = ["#22c55e", "#eab308", "#f97316", "#ef4444"];

const ACTIVITY_TYPE_ICONS: Record<string, React.ReactNode> = {
  assessment: <Stethoscope className="w-3.5 h-3.5" />,
  "plan-created": <ClipboardList className="w-3.5 h-3.5" />,
  "plan-updated": <Activity className="w-3.5 h-3.5" />,
  "patient-added": <UserPlus className="w-3.5 h-3.5" />,
};

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: actLoading } = useGetRecentActivity();
  const { data: breakdown, isLoading: brkLoading } = useGetTriageBreakdown();

  const statCards = [
    { label: "Total Patients", value: summary?.totalPatients, icon: Users, color: "text-primary" },
    { label: "Urgent Triage", value: summary?.urgentTriage, icon: AlertTriangle, color: "text-red-500" },
    { label: "Active Plans", value: summary?.activeManagementPlans, icon: ClipboardList, color: "text-blue-500" },
    { label: "Assessments This Month", value: summary?.assessmentsThisMonth, icon: Activity, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Clinical overview and triage summary</p>
        </div>
        <Button asChild size="sm">
          <Link href="/patients/new">
            <UserPlus className="w-4 h-4 mr-2" />
            New Patient
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                  {sumLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1">{value ?? 0}</p>
                  )}
                </div>
                <div className={`p-2 rounded-lg bg-muted/60 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Triage Level Bar Chart */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Triage Level Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {brkLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <BarChart data={breakdown?.byLevel ?? []} barSize={28}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v} patients`, ""]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(breakdown?.byLevel ?? []).map((_, i) => (
                      <Cell key={i} fill={LEVEL_COLORS[i % LEVEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stage Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {brkLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : (breakdown?.byStage?.length ?? 0) === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie
                    data={breakdown?.byStage ?? []}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="45%"
                    outerRadius={60}
                    label={({ label, percent }) => `${label.replace("Stage ", "S")} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {(breakdown?.byStage ?? []).map((_, i) => (
                      <Cell key={i} fill={STAGE_COLORS_CHART[i % STAGE_COLORS_CHART.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/patients">
              All Patients <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {actLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (activity?.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No activity yet. Add a patient to get started.</div>
          ) : (
            <div className="divide-y divide-border">
              {(activity ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5 p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
                    {ACTIVITY_TYPE_ICONS[item.type] ?? <Activity className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{item.description}</p>
                    {item.patientName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.patientName}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
