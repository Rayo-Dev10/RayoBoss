'use strict';
const form = document.getElementById('loginForm');
const message = document.getElementById('message');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  message.textContent = 'Comprobando credenciales...';
  try {
    const response = await fetch('/api.php?route=/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username.value, password: form.password.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No fue posible ingresar.');
    location.replace('/index.php');
  } catch (error) {
    message.textContent = error.message || 'No fue posible ingresar.';
    button.disabled = false;
    form.password.focus();
    form.password.select();
  }
});
