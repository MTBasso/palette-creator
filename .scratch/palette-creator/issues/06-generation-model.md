# 06 — How does a seed become a whole palette?

Type: grilling
Status: open
Blocked by: 01, 05

## Question

The engine's actual algorithm. Given a seed colour and a character, produce every token in the schema, deterministically, in both themes, with every contrast guarantee held.

- How are the **other hues derived** from the seed — fixed harmony rules (analogous / triadic / complementary), perceptual-distance rules, or a small set of hand-tuned relationships per character?
- How is a **lightness ramp constructed**, and how is it made even across hues where equal lightness reads differently by hue?
- How do light and dark stay recognisably the **same brand** while both holding contrast — what is invariant between them?
- What happens when a guarantee **cannot be met** (a neon seed that no text will sit on)? Does the engine bend the seed, bend the guarantee, or refuse?
- Where does **pinning** enter: given one or more fixed colours, what does the engine solve for and in what order?
- Which of these become the **parameters** the guided controls expose (feeds the control-surface question still in fog).
