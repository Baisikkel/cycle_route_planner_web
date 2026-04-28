import { defineConfig } from 'i18next-cli'

export default defineConfig({
  locales: ['en'],
  extract: {
    input: ['src/**/*.{ts,tsx}'],
    output: 'public/locales/{{language}}/{{namespace}}.json',
    defaultNS: 'translation',
    keySeparator: '.', // Maybe needs to be false or null as we use actual language as keys mostly
    nsSeparator: ':',
    defaultValue: (_lng, _ns, key) => key,
  },
})
