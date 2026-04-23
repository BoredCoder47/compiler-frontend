import { useState, useEffect } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [inputEmail, setInputEmail] = useState("");
  const [inputPassword, setInputPassword] = useState("");

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("python3");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const templates = {
    python3: "print('Hello World')",
    nodejs: "console.log('Hello World');",
    cpp17: `#include <iostream>
using namespace std;

int main() {
  int n;
  cin >> n;
  cout << n;
  return 0;
}`,
    java: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello World");
  }
}`
  };

  /* ================= AUTH ================= */

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();

    // 🔥 keeps user logged in after refresh
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: inputEmail,
      password: inputPassword
    });

    if (error) {
      alert(error.message);
    } else {
      setUser(data.user);
    }
  };

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email: inputEmail,
      password: inputPassword
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Signup successful. Now login.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  /* ================= CODE ================= */

  useEffect(() => {
    setCode(templates[language]);
  }, [language]);

  const runCode = async () => {
    if (!code.trim()) {
      setOutput("Code is empty");
      return;
    }

    setLoading(true);
    setOutput("Running...\n");

    try {
      const res = await axios.post(`${API_URL}/run`, {
        code,
        language,
        input,
        userId: user.id
      });

      setOutput(res.data.output || "No output");
      getHistory();
    } catch (err) {
      console.error(err);
      setOutput(err.response?.data?.error || "Error running code");
    }

    setLoading(false);
  };

  /* ================= HISTORY ================= */

  const getHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/history/${user.id}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) getHistory();
  }, [user]);

  /* ================= LOGIN UI ================= */

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Code Compiler</h2>
          <p>Login to continue</p>

          <input
            type="email"
            placeholder="Email"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
          />

          <button onClick={handleLogin}>Login</button>

          <button className="secondary" onClick={handleSignup}>
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  /* ================= MAIN APP ================= */

  return (
    <div className="app">
      <div className="header">
        <h2>Online Compiler</h2>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="python3">Python</option>
          <option value="nodejs">JavaScript</option>
          <option value="cpp17">C++</option>
          <option value="java">Java</option>
        </select>

        <button onClick={runCode} disabled={loading}>
          {loading ? "Running..." : "Run ▶"}
        </button>

        <button onClick={logout}>Logout</button>
      </div>

      <div className="main">
        {/* EDITOR */}
        <div className="editor">
          <Editor
            height="100%"
            theme="vs-dark"
            language={
              language === "nodejs"
                ? "javascript"
                : language === "cpp17"
                ? "cpp"
                : language === "python3"
                ? "python"
                : "java"
            }
            value={code}
            onChange={(val) => setCode(val)}
          />
        </div>

      </div>

      {/* INPUT + OUTPUT */}
      <div className="side">
        <div className="input-box">
          <h3>Input</h3>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        <div className="output">
          <h3>Output</h3>
          <pre>{output || "Output will appear here..."}</pre>
        </div>
      </div>
       <div style={{ width: "250px", background: "#111", overflow: "auto" }}>
          <h3 style={{ padding: "10px" }}>History</h3>

          {history.map((item, i) => (
            <div
              key={i}
              style={{
                padding: "8px",
                borderBottom: "1px solid #333",
                cursor: "pointer"
              }}
              onClick={() => {
                setCode(item.code);
                setInput(item.input);
                setOutput(item.output);
              }}
            >
              <small>{item.language}</small>
              <br />
              <small>{item.output.slice(0, 40)}</small>
            </div>
          ))}
        </div>
    </div>
  );
}

export default App;