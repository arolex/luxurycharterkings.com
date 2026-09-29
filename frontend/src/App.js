import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ConciergeProvider } from "@/context/ConciergeContext";
import { Layout } from "@/components/Layout";
import { ConciergeChat } from "@/components/ConciergeChat";
import Home from "@/pages/Home";
import CategoryPage from "@/pages/CategoryPage";
import ListingDetail from "@/pages/ListingDetail";
import SignIn from "@/pages/SignIn";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Admin from "@/pages/Admin";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ConciergeProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/jets" element={<CategoryPage category="jets" />} />
                <Route path="/yachts" element={<CategoryPage category="yachts" />} />
                <Route path="/cars" element={<CategoryPage category="cars" />} />
                <Route path="/tours" element={<CategoryPage category="tours" />} />
                <Route path="/villas" element={<CategoryPage category="villas" />} />
                <Route path="/vip" element={<CategoryPage category="vip" />} />
                <Route path="/listing/:slug" element={<ListingDetail />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
            <ConciergeChat />
            <Toaster position="top-center" richColors />
          </ConciergeProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
