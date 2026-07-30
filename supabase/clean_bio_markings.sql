-- Migration: Limpeza de marcações brutas de texto (ex: === INCLUSO ===, ==== INCLUSO ======, === ESPECIALIDADES ===, === REGRAS ===) em perfis e anúncios

UPDATE profiles
SET bio = TRIM(
  regexp_replace(
    regexp_replace(
      regexp_replace(bio, '(?:={2,}|-{2,}|#{2,})\s*[A-ZÀ-Ú\s_]+?\s*(?:={2,}|-{2,}|#{2,})', '', 'gi'),
      '\b(INCLUSO|ESPECIALIDADES|REGRAS)\b\s*[:=]*', '', 'gi'
    ),
    '\s+', ' ', 'g'
  )
)
WHERE bio LIKE '%===%' OR bio LIKE '%==%' OR bio ILIKE '%INCLUSO%';

UPDATE ads
SET description = TRIM(
  regexp_replace(
    regexp_replace(
      regexp_replace(description, '(?:={2,}|-{2,}|#{2,})\s*[A-ZÀ-Ú\s_]+?\s*(?:={2,}|-{2,}|#{2,})', '', 'gi'),
      '\b(INCLUSO|ESPECIALIDADES|REGRAS)\b\s*[:=]*', '', 'gi'
    ),
    '\s+', ' ', 'g'
  )
)
WHERE description LIKE '%===%' OR description LIKE '%==%' OR description ILIKE '%INCLUSO%';
