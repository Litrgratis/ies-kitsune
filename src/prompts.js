export const PROMPTS = {
    debugger: `Analizuj logi błędów z IES:
- Log: "\${log}"
- Kod: "\${codeSnippet}"
Zidentyfikuj przyczynę błędu i zaproponuj poprawkę. Określ priorytet:
- Wysoki: Błędy API (429/500), krytyczne dla critical_path
- Średni: Błędy UI, częste (>3 w 100 zapytań)
- Niski: Pozostałe
Format:
{
  "error": "opis błędu",
  "fix": "propozycja poprawki",
  "priority": "niski/średni/wysoki"
}`
};