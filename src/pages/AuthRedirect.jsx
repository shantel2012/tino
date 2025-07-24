import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthRedirect() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const role = user.user_metadata?.role || "user";

      if (role === "admin") {
        navigate("/dashboard/admin", { replace: true });
      } else if (role === "owner") {
        navigate("/dashboard/owner", { replace: true });
      } else {
        navigate("/dashboard/user", { replace: true });
      }
    }
    checkUser();
  }, [navigate]);

  return <div>Loading...</div>;
}
