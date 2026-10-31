// Serialize trusted catalog expressions to native MathML, as used by the articles.
const assert=require('node:assert/strict');
const tags=new Set(['mrow','mi','mn','mo','mtext','msup','msub','mfrac','msqrt','mtable','mtr','mtd','munderover']);
const leaves=new Set(['mi','mn','mo','mtext']);
function validateFormula(formula){
 assert.ok(formula&&typeof formula.label==='string'&&formula.label.length>2&&formula.label.length<250);
 assert.ok(Array.isArray(formula.expressions)&&formula.expressions.length>=1&&formula.expressions.length<=4);
 let nodes=0;
 function visit(node,depth=0){
  assert.ok(Array.isArray(node)&&tags.has(node[0])&&depth<=24&&++nodes<=500,'Invalid MathML expression');
  if(leaves.has(node[0])){assert.equal(node.length,2);assert.ok(typeof node[1]==='string'&&node[1].length>0&&node[1].length<=120);}
  else{assert.ok(node.length>=2);if(['msup','msub','mfrac'].includes(node[0]))assert.equal(node.length,3);if(node[0]==='munderover')assert.equal(node.length,4);node.slice(1).forEach(n=>visit(n,depth+1));}
 }
 formula.expressions.forEach(n=>visit(n));
}
function renderFormula(formula,esc){
 validateFormula(formula);
 const node=n=>`<${n[0]}>${leaves.has(n[0])?esc(n[1]):n.slice(1).map(node).join('')}</${n[0]}>`;
 return formula.expressions.map(n=>`<math display="block" aria-label="${esc(formula.label)}">${node(n)}</math>`).join('');
}
module.exports={validateFormula,renderFormula};
