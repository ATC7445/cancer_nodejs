const BASE_URL = window.location.origin + "/cancer_nodejs";
document.addEventListener("DOMContentLoaded", function () {
  checkLoginStatus();
});

function checkLoginStatus() {
  fetch(`${BASE_URL}/check-auth`) //`${BASE_URL}/clear-upload`
    .then((response) => response.json())
    .then((data) => {
      const authNav = document.getElementById("authNav");
      authNav.innerHTML = "";

      if (data.loggedin) {
        // สร้างปุ่ม Logout
        const welcomeItem = document.createElement("li");
        welcomeItem.className = "nav-item";
        welcomeItem.innerHTML = `<span class="nav-link fs-5 text-light">Welcome, ${data.username}</span>`;

        const logoutItem = document.createElement("li");
        logoutItem.className = "nav-item";
        logoutItem.innerHTML = `<a class="nav-link text-light fs-5 btn btn-danger" href="#" id="logoutBtn">Logout</a>`;

        authNav.appendChild(welcomeItem);
        authNav.appendChild(logoutItem);

        // เพิ่ม Event Listener สำหรับปุ่ม Logout
        document
          .getElementById("logoutBtn")
          .addEventListener("click", function (e) {
            e.preventDefault();
            logout();
          });
      } else {
        // สร้างปุ่ม Login
        const loginItem = document.createElement("li");
        loginItem.className = "nav-item";
        loginItem.innerHTML = `<a class="nav-link text-light fs-5 btn btn-success" href="/cancer_nodejs">Login</a>`;
        authNav.appendChild(loginItem);
      }
    })
    .catch((error) => console.error("Error:", error));
}

// แก้ไขฟังก์ชัน logout
function logout() {
  fetch(`${BASE_URL}/logout`, { method: "GET" })
    .then(() => {
      // เปลี่ยนเป็น redirect ไปหน้า login โดยไม่ต้อง reload
      window.location.href = "/?logout=true";
    })
    .catch((error) => {
      console.error("Error:", error);
      window.location.href = "/"; // ถ้า error ก็ให้ไปหน้า login ธรรมดา
    });
}

// ตรวจสอบสถานะการล็อกอินเมื่อโหลดหน้า
window.addEventListener("load", function () {
  fetch("/check-auth")
    .then((response) => response.json())
    .then((data) => {
      if (
        data.loggedin &&
        window.location.pathname.endsWith("/cancer_nodejs")
      ) {
        // ถ้าล็อกอินอยู่และอยู่ที่หน้า Login ให้ redirect ไปหน้า Home
        window.location.href = "/home";
      }
    });
});

// เพิ่มฟังก์ชันตรวจสอบการล็อกอินแบบ real-time
function validateSession() {
  fetch(`${BASE_URL}/check-auth`, {
    credentials: "same-origin", // เพื่อให้ส่ง session cookie
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Session check failed");
      }
      return response.json();
    })
    .then((data) => {
      const isLoginPage =
        window.location.pathname === "/" ||
        window.location.pathname === "/cancer_nodejs";

      if (data.loggedin && isLoginPage) {
        window.location.href = "/home";
      } else if (!data.loggedin && !isLoginPage && !isLoggingOut()) {
        window.location.href = "/?session_expired=true";
      }
    })
    .catch((error) => {
      console.error("Session validation error:", error);
      if (!isLoginPage() && !isLoggingOut()) {
        window.location.href = "/?session_error=true";
      }
    });
}
// ฟังก์ชันช่วยเหลือ
function isLoginPage() {
  return (
    window.location.pathname === "/" ||
    window.location.pathname === "/cancer_nodejs"
  );
}

function isLoggingOut() {
  return new URLSearchParams(window.location.search).has("logout");
}

// ตรวจสอบทุกครั้งที่หน้าโหลด
window.addEventListener("load", function () {
  validateSession();

  // แสดงข้อความ logout success ถ้ามี
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") {
    showLogoutMessage();
  }
});

// แสดงข้อความ logout
function showLogoutMessage() {
  const message = document.createElement("div");
  message.className = "logout-message";
  message.textContent = "You have been logged out successfully.";
  document.body.prepend(message);

  setTimeout(() => {
    message.remove();
  }, 3000);
}
