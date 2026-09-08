+++
title = "various models of linear logic"
date = 2026-07-10
+++

\documentclass{article}
\usepackage{amssymb}
\usepackage{amsmath}
\usepackage{cmll}

\usepackage{graphicx} % Required for inserting images



Classical/Intuitionistic logic is governed by a set of structural and logical rules. The logical rules comprise of modus ponens, $\wedge$, $\vee$, $\bot$. The structural rules comprise of contraction, weakening and exchange. The rules for each are as follows: $$\frac{\Gamma, A, A \vdash \Delta}{\Gamma, A \vdash \Delta}, \quad  \frac{\Gamma \vdash \Delta}{\Gamma, A \vdash \Delta}  \quad , \frac{\Gamma, A, B, \Sigma \vdash \Delta}{\Gamma, B, A, \Sigma \vdash \Delta} $$ respectively. 

Linear logic, however, refines the classical/intuitionistic logic by omitting the contraction and weakening rule. Thus, linear logic strictly requires every premise to be used exactly once.

A natural question to ask is why use a more restricted logic? Yves Saint Girard motivates linear logic via resource availability. $A \vdash B$ can be interpreted as using resource $A$  to make available resource $B$. During this process, it is possible that resource $A$ changes or gets consumed. Ergo, linear logic allows us to refrain from duplicating or discarding resources. 

The propositions for linear logic is as follows

 \begin{tabular}{|c|l|l|}
\hline
\textbf{Symbol} & \textbf{Read as} & \textbf{Name} \\
\hline
\multicolumn{3}{|l|}{\textit{Every propositional variable is a proposition.}} \\
\hline
$A^{\perp}$ & negation & Negation of $A$ \\
\hline
\multicolumn{3}{|l|}{\textit{For propositions $A$ and $B$:}} \\
\hline
$A \& B$ & with & Additive conjunction of $A$ and $B$ \\
$A \oplus B$ & plus & Additive disjunction of $A$ and $B$ \\
$A \otimes B$ & times & Multiplicative conjunction of $A$ and $B$ \\
$A \parr  B$ & par & Multiplicative disjunction of $A$ and $B$ (also $A \mid B$) \\
\hline
\multicolumn{3}{|l|}{\textit{Constants:}} \\
\hline
$\top$ & top & Additive truth \\
$0$ & zero & Additive falsity \\
$1$ & one & Multiplicative truth \\
$\bot$ & bottom & Multiplicative falsity \\
\hline
\multicolumn{3}{|l|}{\textit{For each proposition $A$:}} \\
\hline
$!A$ & of course & Exponential conjunction of $A$ \\
$?A$ & why not & Exponential disjunction of $A$ \\
\hline
\end{tabular} 



