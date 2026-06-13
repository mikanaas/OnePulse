import { useGetPortfolioStats, useGetPortfolioSavingsOverTime, useGetProjectsByStatus, useGetProjectsByUnit, useGetSavingsByProject } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Cell } from "recharts";
import { Activity, Briefcase, CheckCircle, Lightbulb, Users, TrendingUp, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function StatCard({ title, value, icon: Icon, description, loading }: { title: string, value: string | number, icon: any, description?: string, loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortfolioPage() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetPortfolioStats();
  const { data: savingsTime, isLoading: timeLoading } = useGetPortfolioSavingsOverTime();
  const { data: statusData, isLoading: statusLoading } = useGetProjectsByStatus();
  const { data: unitData, isLoading: unitLoading } = useGetProjectsByUnit();
  const { data: projectSavings, isLoading: projSavingsLoading } = useGetSavingsByProject();

  const handleProjectClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0] && data.activePayload[0].payload) {
      setLocation(`/projects/${data.activePayload[0].payload.projectId}`);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Porteføljeoversikt</h1>
          <p className="text-muted-foreground">Oversikt over alle digitaliserings- og AI-prosjekter.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Aktive prosjekter" 
            value={stats?.activeProjects || 0} 
            icon={Activity} 
            description={`Av totalt ${stats?.totalProjects || 0} prosjekter`}
            loading={statsLoading} 
          />
          <StatCard 
            title="Realiserte besparelser" 
            value={formatCurrency(stats?.totalRealizedSavings)} 
            icon={TrendingUp} 
            description={`Mål: ${formatCurrency(stats?.totalEstimatedSavings)}`}
            loading={statsLoading} 
          />
          <StatCard 
            title="Totale kostnader" 
            value={formatCurrency(stats?.totalCosts)} 
            icon={DollarSign} 
            loading={statsLoading} 
          />
          <StatCard 
            title="Involverte ansatte" 
            value={stats?.uniqueMembers || 0} 
            icon={Users} 
            loading={statsLoading} 
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Besparelser over tid</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {timeLoading ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={savingsTime} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => {
                        try {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getFullYear()}`;
                        } catch { return val; }
                      }} 
                    />
                    <YAxis 
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} 
                      width={60}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => new Date(label as string).toLocaleDateString("no-NO")}
                    />
                    <Line type="monotone" dataKey="accumulated" name="Besparelser" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Prosjekter per status</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {statusLoading ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                    >
                      {statusData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Prosjekter per forretningsområde</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {unitLoading ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="businessUnit" />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" name="Antall" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Topp prosjekter etter besparelse</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {projSavingsLoading ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={projectSavings?.slice(0, 5)} 
                    layout="vertical"
                    margin={{ top: 5, right: 20, bottom: 5, left: 40 }}
                    onClick={handleProjectClick}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="projectName" type="category" width={100} tick={{ fontSize: 12 }} />
                    <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="realized" name="Realisert" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="target" name="Mål" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}