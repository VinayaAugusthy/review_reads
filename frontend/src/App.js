import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Feed from "@/pages/Feed";
import ReviewDetail from "@/pages/ReviewDetail";
import NewReview from "@/pages/NewReview";
import Books from "@/pages/Books";
import Profile from "@/pages/Profile";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reviews" element={<Feed />} />
              <Route
                path="/reviews/new"
                element={
                  <ProtectedRoute>
                    <NewReview />
                  </ProtectedRoute>
                }
              />
              <Route path="/reviews/:id" element={<ReviewDetail />} />
              <Route path="/books" element={<Books />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
