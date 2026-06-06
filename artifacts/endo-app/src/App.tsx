import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import NewPatient from "@/pages/NewPatient";
import PatientProfile from "@/pages/PatientProfile";
import AssessmentWizard from "@/pages/AssessmentWizard";
import CreatePlan from "@/pages/CreatePlan";
import ManagementPlans from "@/pages/ManagementPlans";
import Medications from "@/pages/Medications";
import Investigations from "@/pages/Investigations";
import Surgery from "@/pages/Surgery";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/patients" component={Patients} />
        <Route path="/patients/new" component={NewPatient} />
        <Route path="/patients/:id/assess" component={AssessmentWizard} />
        <Route path="/patients/:id/plan" component={CreatePlan} />
        <Route path="/patients/:id" component={PatientProfile} />
        <Route path="/patients/:id/investigations" component={Investigations} />
        <Route path="/patients/:id/surgery" component={Surgery} />
        <Route path="/management-plans" component={ManagementPlans} />
        <Route path="/medications" component={Medications} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
