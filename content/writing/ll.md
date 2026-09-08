+++ title = "various models of linear logic" date = 2026-07-10 +++

Classical/Intuitionistic logic is governed by a set of structural and logical rules. The logical rules comprise modus ponens, $\wedge$, $\vee$, and $\bot$. The structural rules comprise contraction, weakening, and exchange. The rules for each are as follows:

$$
\frac{\Gamma, A, A \vdash \Delta}{\Gamma, A \vdash \Delta},
\qquad
\frac{\Gamma \vdash \Delta}{\Gamma, A \vdash \Delta},
\qquad
\frac{\Gamma, A, B, \Sigma \vdash \Delta}
     {\Gamma, B, A, \Sigma \vdash \Delta}
$$

respectively.

Linear logic, however, refines classical/intuitionistic logic by omitting the contraction and weakening rules. Thus, linear logic strictly requires every premise to be used exactly once.

A natural question to ask is why use a more restricted logic? Yves Saint Girard motivates linear logic via resource availability. $A \vdash B$ can be interpreted as using resource $A$ to make resource $B$ available. During this process, it is possible that resource $A$ changes or gets consumed. Ergo, linear logic allows us to refrain from duplicating or discarding resources.

## Propositions of Linear Logic

| Symbol | Read as | Name |
|---|---|---|
| Every propositional variable is a proposition. | | |
| $A^\perp$ | negation | Negation of $A$ |
| $A \mathbin{\&} B$ | with | Additive conjunction of $A$ and $B$ |
| $A \oplus B$ | plus | Additive disjunction of $A$ and $B$ |
| $A \otimes B$ | times | Multiplicative conjunction of $A$ and $B$ |
| $A \parr B$ | par | Multiplicative disjunction of $A$ and $B$ |
| $\top$ | top | Additive truth |
| $0$ | zero | Additive falsity |
| $1$ | one | Multiplicative truth |
| $\bot$ | bottom | Multiplicative falsity |
| $!A$ | of course | Exponential conjunction of $A$ |
| $?A$ | why not | Exponential disjunction of $A$ |
