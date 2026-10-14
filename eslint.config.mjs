import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Los textos están en español, con comillas y apóstrofes normales en el JSX.
      "react/no-unescaped-entities": "off",
      // Resetear un formulario (y el estado de UI asociado) después de que useActionState confirma que
      // el server action terminó bien es exactamente el caso de uso de este patrón — queda como aviso,
      // no error, igual que en corto.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**", "tests/e2e/**"]),
]);

export default eslintConfig;
