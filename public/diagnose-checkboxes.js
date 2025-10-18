/**
 * Script de diagnostic pour les checkboxes
 * 
 * Coller ce code dans la console du navigateur pour diagnostiquer
 * pourquoi le texte passe sous la checkbox.
 * 
 * Usage: Ouvre l'éditeur avec des task items, puis colle ce script dans la console
 */

(function diagnoseCheckboxes() {
  console.log('🔍 DIAGNOSTIC CHECKBOXES - DÉBUT');
  console.log('=====================================\n');

  // Trouver tous les task items
  const taskItems = document.querySelectorAll(
    'li[data-type="taskItem"], .task-list-item, li:has(> input[type="checkbox"])'
  );

  if (taskItems.length === 0) {
    console.error('❌ Aucun task item trouvé!');
    return;
  }

  console.log(`✅ Trouvé ${taskItems.length} task item(s)\n`);

  taskItems.forEach((li, index) => {
    console.log(`\n=== TASK ITEM #${index + 1} ===`);
    console.log('HTML:', li.outerHTML.substring(0, 200) + '...');
    
    // Styles du LI
    const liStyles = window.getComputedStyle(li);
    console.log('\n📦 Styles du LI:');
    console.log('  display:', liStyles.display);
    console.log('  flex-direction:', liStyles.flexDirection);
    console.log('  gap:', liStyles.gap);
    console.log('  align-items:', liStyles.alignItems);
    console.log('  list-style:', liStyles.listStyle);
    
    // Trouver la checkbox
    const checkbox = li.querySelector('input[type="checkbox"]');
    if (checkbox) {
      const cbStyles = window.getComputedStyle(checkbox);
      console.log('\n☑️  Styles de la CHECKBOX:');
      console.log('  flex:', cbStyles.flex);
      console.log('  flex-grow:', cbStyles.flexGrow);
      console.log('  flex-shrink:', cbStyles.flexShrink);
      console.log('  flex-basis:', cbStyles.flexBasis);
      console.log('  margin:', cbStyles.margin);
      console.log('  width:', cbStyles.width);
      console.log('  height:', cbStyles.height);
    }
    
    // Analyser les enfants
    console.log('\n👶 Enfants directs du LI:');
    Array.from(li.children).forEach((child, i) => {
      const childStyles = window.getComputedStyle(child);
      console.log(`\n  Enfant #${i + 1}: <${child.tagName.toLowerCase()}>`);
      console.log('    display:', childStyles.display);
      console.log('    flex:', childStyles.flex);
      console.log('    width:', childStyles.width);
      console.log('    margin:', childStyles.margin);
      console.log('    padding:', childStyles.padding);
      
      if (child.tagName.toLowerCase() !== 'input') {
        console.log('    innerHTML:', child.innerHTML.substring(0, 50));
      }
    });
    
    // Vérifier si le texte est vraiment en dessous
    if (checkbox) {
      const cbRect = checkbox.getBoundingClientRect();
      const textElements = li.querySelectorAll('p, span, div:not(:has(input))');
      
      if (textElements.length > 0) {
        const textRect = textElements[0].getBoundingClientRect();
        console.log('\n📐 Position relative:');
        console.log('  Checkbox top:', cbRect.top);
        console.log('  Checkbox bottom:', cbRect.bottom);
        console.log('  Text top:', textRect.top);
        console.log('  Text left:', textRect.left);
        console.log('  Checkbox left:', cbRect.left);
        
        if (textRect.top > cbRect.bottom) {
          console.error('  ❌ PROBLÈME: Le texte est EN DESSOUS de la checkbox!');
        } else if (Math.abs(textRect.left - (cbRect.right + 10)) < 20) {
          console.log('  ✅ OK: Le texte est À CÔTÉ de la checkbox');
        } else {
          console.warn('  ⚠️  Position suspecte du texte');
        }
      }
    }
  });

  console.log('\n\n🔍 DIAGNOSTIC CHECKBOXES - FIN');
  console.log('=====================================');
})();

