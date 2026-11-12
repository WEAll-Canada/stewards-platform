-- Temporary password reset for staging testing (plain password: testtest).
UPDATE users
SET password_hash = 'Oc0xlO4SLHO40zBoHaJHQQ==:+MCxITm66cgVFz5aH18kXeb3NMMzBl5+kjwoRWJq9vE='
WHERE lower(email) = 'naryan@gmail.com';
