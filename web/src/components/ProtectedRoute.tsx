import { Navigate } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { user, isAdmin } = useAuthContext();

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}
