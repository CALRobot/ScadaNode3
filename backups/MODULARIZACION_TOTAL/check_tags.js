const { tags } = require('./tags'); 
/*
es un script de ayuda para controlar si hay tags duplicados de 'name' , ni con la misma combinación dir + word + bit.
Si no imprime nada todo bien
*/
const byName = new Map();
const byAddr = new Map();

for (const t of tags) {
  const keyName = t.name;
  const keyAddr = `${t.dir}-${t.word}-${t.bit ?? 'WORD'}`;

  if (byName.has(keyName)) {
    console.warn('Nombre duplicado:', keyName);
  } else {
    byName.set(keyName, t);
  }

  if (byAddr.has(keyAddr)) {
    console.warn('Dirección duplicada:', keyAddr, 'entre', byAddr.get(keyAddr).name, 'y', t.name);
  } else {
    byAddr.set(keyAddr, t);
  }
}
