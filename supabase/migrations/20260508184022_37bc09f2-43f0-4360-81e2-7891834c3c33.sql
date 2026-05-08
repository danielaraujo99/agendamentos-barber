
DELETE FROM public.products WHERE category IN ('aneis','cordoes','pulseiras');

INSERT INTO public.products (title, description, price, image_url, category, stock, active) VALUES
('Camisa Time Brasil Amarela', 'Camisa oficial torcedor — tecido dry-fit respirável', 189.90, 'https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?w=900&q=85&auto=format&fit=crop', 'camisetas', 30, true),
('Camisa Time Flamengo Rubro-Negra', 'Camisa torcedor listrada — manto sagrado', 199.90, 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=900&q=85&auto=format&fit=crop', 'camisetas', 25, true),
('Camisa Retrô Seleção 1970', 'Camisa retrô em algodão premium', 159.90, 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=900&q=85&auto=format&fit=crop', 'camisetas', 20, true),
('Camisa Time Corinthians Preta', 'Camisa torcedor preta — tecido dry-fit', 199.90, 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=900&q=85&auto=format&fit=crop', 'camisetas', 22, true),
('Bermuda Esportiva Time Preta', 'Bermuda em tecido leve para treino e jogo', 89.90, 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=900&q=85&auto=format&fit=crop', 'bermudas', 35, true),
('Bermuda Futebol Listrada', 'Bermuda esportiva com listras laterais', 79.90, 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=900&q=85&auto=format&fit=crop', 'bermudas', 28, true);
