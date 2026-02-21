document.addEventListener("DOMContentLoaded", () => {

    // --- REGISTER FORM LOGIC ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const username = document.getElementById('Username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const messageDiv = document.getElementById('message');

            if (password !== confirmPassword) {
                messageDiv.className = "alert alert-danger";
                messageDiv.textContent = "As senhas não coincidem!";
                messageDiv.style.display = "block";
                return;
            }

            try {
                const response = await fetch('/identity/register-custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, username })
                });

                if (response.ok) {
                    messageDiv.className = "alert alert-success";
                    messageDiv.textContent = "Usuário registrado com sucesso! Redirecionando...";
                    messageDiv.style.display = "block";
                    setTimeout(() => window.location.href = '/html/login.html', 2000);
                } else {
                    const errorData = await response.json();
                    const errorMsg = errorData.errors ? Object.values(errorData.errors).flat().join(" ") : "Erro ao registrar.";
                    messageDiv.className = "alert alert-danger";
                    messageDiv.textContent = errorMsg;
                    messageDiv.style.display = "block";
                }
            } catch (error) {
                messageDiv.className = "alert alert-danger";
                messageDiv.textContent = "Erro de conexão com o servidor.";
                messageDiv.style.display = "block";
            }
        });
    }

    // --- LOGIN FORM LOGIC ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/identity/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem("token", data.accessToken);

                    // Extract role FROM the token instead of data.role
                    const role = getRoleFromToken(data.accessToken);
                    localStorage.setItem("userRole", role);

                    window.location.href = '/';
                } else {
                    const errorData = await response.json();
                    const errorMsg = errorData.error || "Erro ao fazer login.";
                    alert(errorMsg);
                }
            } catch (error) {
                alert("Erro de conexão com o servidor.");
            }
        });
    }
});

function getRoleFromToken(token) {
    try {
        const base64Url = token.split('.')[1]; // Get the middle part of the JWT
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));

        // ASP.NET Identity stores roles in a specific URI key
        return payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload["role"];
    } catch (e) {
        console.error("Error decoding token:", e);
        return null;
    }
}