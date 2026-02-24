# Design System Refactoring Guide

## 🎨 Visão Geral

Refatoração completa do design visual do app PWA para personal trainers com paleta profissional preta/laranja, tipografia moderna (Inter + Poppins), microinterações suaves e melhorias UX específicas.

## 📋 Implementado

### ✅ Design System Base (`src/index.css`)
- **Paleta de Cores**: Preto/Laranja com 10 tons de cinza + cores semânticas
- **Tipografia**: Inter (body) + Poppins (display) com escala clara
- **Espaçamento**: Escala 4px (0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32)
- **Border Radius**: xs (0.25rem) até full (9999px)
- **Shadows**: xs até 2xl com elevação sutil

### ✅ Componentes Base
- `.card` - Elevação com shadow, border cinza-claro, hover effect
- `.btn` (primary/secondary/ghost/danger) - Microinterações 150ms, min 44px
- `.input-base` - Focus com orange ring, disabled states
- `.badge` - Pills com variantes (orange, success, error)
- `.tab-group` - Navegação com active state laranja

### ✅ Animações (150-300ms ease-out)
- `fadeInUp`, `slideIn*`, `scaleIn`, `bounce`, `confetti`
- Skeleton loading com shimmer
- Empty states com ícones
- Toast notifications com variantes

### ✅ Componentes Refatorados
- **BottomNavigation** - Paleta laranja, microinterações 150ms, acessibilidade

### ⏳ Componentes a Refatorar

## 🔧 Como Refatorar Componentes

### Padrão de Refatoração

1. **Remover cores hardcoded** (azul, roxo, cinza antigos)
2. **Usar variáveis CSS** do design system:
   - `var(--color-orange-600)` para CTA principal
   - `var(--color-black)` para texto principal
   - `var(--color-gray-*)` para neutros
3. **Aplicar microinterações**:
   - `transition: all 150ms ease-out`
   - Hover effects sutis
   - Active states com feedback visual
4. **Garantir acessibilidade**:
   - `aria-label`, `aria-current` em navegação
   - Min-height 44px em botões/inputs
   - Focus-visible com outline laranja
5. **Usar classes do design system**:
   - `.card` em vez de `.section-card`
   - `.btn .btn-primary` em vez de gradientes inline
   - `.badge` para badges/pills

### Exemplo: Refatorar um Componente

**Antes:**
```tsx
<button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-xl">
  Ação
</button>
```

**Depois:**
```tsx
<button 
  className="btn btn-primary"
  aria-label="Descrição da ação"
>
  Ação
</button>
```

## 📱 Mobile-First Checklist

- [ ] Touch targets mínimo 44x44px
- [ ] Safe areas respeitadas (`safe-area-inset`)
- [ ] Bottom sheet em vez de modals onde possível
- [ ] Navegação thumb-friendly
- [ ] Lazy loading de imagens
- [ ] Skeleton screens durante carregamento

## ♿ Acessibilidade Checklist

- [ ] Contraste WCAG AA (4.5:1 para texto)
- [ ] Focus-visible com outline colorido
- [ ] Labels descritivos em inputs
- [ ] Hierarquia semântica HTML correta
- [ ] Suporte a `prefers-reduced-motion`
- [ ] aria-label, aria-current em navegação

## 🎯 Próximos Passos

1. Refatorar Schedule.tsx (schedule-card com estados)
2. Refatorar Students.tsx (student-card com avatar)
3. Refatorar Finance.tsx (cards com hierarquia)
4. Refatorar Evolution.tsx (photo-grid com zoom)
5. Testar em dispositivos reais
6. Validar performance e acessibilidade

## 📚 Referências

- **Linear.app** - Minimalismo, micro-interações
- **Stripe Dashboard** - Hierarquia, espaçamento
- **Notion** - Cards, tipografia
- **Apple Health** - Data visualization

## 🚀 Performance

- Build size: ~220KB (gzip)
- Animações: 150-300ms (não trava)
- Lazy loading de imagens
- Skeleton screens durante carregamento
- Optimistic UI updates

---

**Status**: Design system base implementado ✅
**Próximo**: Refatorar componentes React principais
