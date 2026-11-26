import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ProtectedRoute } from "@/components/protected-route";
import { Compass } from "lucide-react";
import { AuthPage } from "@/pages/auth-page";
import { CreateTeamPage } from "@/pages/create-team-page";
import { MyTeamsPage } from "@/pages/my-teams-page";
import { PlazaPage } from "@/pages/plaza-page";
import { TeamDetailPage } from "@/pages/team-detail-page";

function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const timer = window.setTimeout(() => {
        document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.hash, location.pathname]);
  return null;
}

function NotFoundPage() {
  return (
    <div className="page-shell py-16">
      <EmptyState
        icon={Compass}
        title="这个页面不在组队广场里"
        description="页面地址可能已经改变，回到广场看看正在招募的队伍吧。"
        actionLabel="返回广场"
        actionTo="/"
      />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<PlazaPage />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="teams/:teamId" element={<TeamDetailPage />} />
          <Route
            path="create-team"
            element={
              <ProtectedRoute>
                <CreateTeamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-teams"
            element={
              <ProtectedRoute>
                <MyTeamsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
