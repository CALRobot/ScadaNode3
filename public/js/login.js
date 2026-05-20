// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const btnLogin = document.querySelector('.btn-login');
  const btnText = document.querySelector('.btn-text');
  const btnLoader = document.querySelector('.btn-loader');

  // Verificar si ya está autenticado
  checkAuth();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Por favor, complete todos los campos');
      return;
    }

    // Mostrar loading
    setLoading(true);
    hideError();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Login exitoso
        console.log('Login exitoso:', data.user);
        window.location.href = '/index.html';
      } else {
        // Login fallido
        showError(data.error || 'Credenciales inválidas');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error de login:', error);
      showError('Error de conexión con el servidor');
      setLoading(false);
    }
  });

  function setLoading(loading) {
    btnLogin.disabled = loading;
    if (loading) {
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
    } else {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
    }
  }

  function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }

  function hideError() {
    loginError.classList.add('hidden');
  }

  async function checkAuth() {
    try {
      const response = await fetch('/api/me');
      const data = await response.json();
      
      if (data.authenticated) {
        // Ya está autenticado, redirigir al index
        console.log('Usuario ya autenticado:', data.user);
        window.location.href = '/index.html';
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
    }
  }

  // Permitir Enter para enviar
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginForm.dispatchEvent(new Event('submit'));
    }
  });
});
