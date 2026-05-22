// public/js/auth.js - Manejo de autenticación en index.html

document.addEventListener('DOMContentLoaded', () => {
  const btnLogout = document.getElementById('btn-logout');
  const userDisplay = document.getElementById('user-display');

  // Verificar autenticación al cargar
  checkAuth();

  // Manejar logout
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  async function checkAuth() {
    try {
      const response = await fetch('/api/me');
      const data = await response.json();

      if (!data.authenticated) {
        // No autenticado, redirigir a login
        console.log('Usuario no autenticado, redirigiendo a login...');
        window.location.href = '/login.html';
      } else {
        // Autenticado, mostrar nombre de usuario
        console.log('Usuario autenticado:', data.user);
        if (userDisplay) {
          userDisplay.textContent = data.user.username;
        }
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      // En caso de error, redirigir a login por seguridad
      window.location.href = '/login.html';
    }
  }

  async function handleLogout() {
    if (!confirm('¿Está seguro de que desea cerrar sesión?')) {
      return;
    }

    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('Sesión cerrada correctamente');
        window.location.href = '/login.html';
      } else {
        console.error('Error al cerrar sesión');
        alert('Error al cerrar sesión. Intente nuevamente.');
      }
    } catch (error) {
      console.error('Error de logout:', error);
      alert('Error de conexión. Intente nuevamente.');
    }
  }
});
