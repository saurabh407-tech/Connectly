const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLogin = ({ email, password }) => {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Enter your password';
  return errors;
};

export const validateRegister = ({ name, email, password, confirmPassword }) => {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your name';
  else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Create a password';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
  if (!confirmPassword) errors.confirmPassword = 'Confirm your password';
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match';
  return errors;
};
