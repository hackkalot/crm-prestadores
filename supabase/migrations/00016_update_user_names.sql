-- Update user display names
-- Fix missing names for the 4 users

UPDATE users SET name = 'Mariana Mendonça Santiago' WHERE email = 'mariana.mendonca.santiago@fidelidade.pt';
UPDATE users SET name = 'Ricardo Alves Andrade' WHERE email = 'ricardo.alves.andrade@fidelidade.pt';
UPDATE users SET name = 'Yola Kiffen Rodrigues' WHERE email = 'yola.kiffen.rodrigues@fidelidade.pt';
UPDATE users SET name = 'Diogo Pita' WHERE email = 'diogohenriquepita@gmail.com';

-- Add comment
COMMENT ON TABLE users IS 'User display names updated on 2026-01-08';
