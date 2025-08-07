require('dotenv').config({ path: '.env.local' });

// Import du parser (simulation pour le test)
class ToolCallsParser {
  constructor() {
    this.contentBuffer = '';
    this.callMap = new Map();
  }

  braceDelta(char) {
    return char === '{' ? 1 : char === '}' ? -1 : 0;
  }

  safeParseArgs(raw) {
    let candidate = raw.trim();

    // Remove wrapping quotes if present
    if (/^"[\s\S]*"$/.test(candidate)) {
      candidate = candidate.slice(1, -1);
    }

    // Ensure braces exist
    if (!candidate.startsWith('{')) candidate = '{' + candidate;
    if (!candidate.endsWith('}')) candidate = candidate + '}';

    try {
      return JSON.parse(candidate);
    } catch {
      return undefined; // still incomplete
    }
  }

  feed(chunk) {
    // Collect assistant readable content
    if (chunk.delta?.content) {
      this.contentBuffer += chunk.delta.content;
    }
    // Handle TogetherAI legacy "text" field as well
    if (typeof chunk.text === 'string' && !chunk.delta?.content) {
      this.contentBuffer += chunk.text;
    }

    // Handle tool_calls array (one or many)
    const tcArray = chunk.delta?.tool_calls ?? chunk.tool_calls;
    if (!Array.isArray(tcArray)) return;

    tcArray.forEach((tc) => {
      const idx = tc.index ?? 0;
      let call = this.callMap.get(idx);
      if (!call) {
        call = {
          id: tc.id ?? `call_${idx}`,
          index: idx,
          name: tc.function?.name ?? 'unknown',
          rawArgs: '',
          completed: false,
        };
        this.callMap.set(idx, call);
      }

      // Append any argument fragment
      if (typeof tc.function?.arguments === 'string') {
        call.rawArgs += tc.function.arguments;
        // Check brace balance to know if we hit JSON completeness
        const balance = [...tc.function.arguments].reduce((acc, ch) => acc + this.braceDelta(ch), 0);
        const totalBalance = [...call.rawArgs].reduce((acc, ch) => acc + this.braceDelta(ch), 0);
        if (balance !== 0 && totalBalance === 0) {
          const parsed = this.safeParseArgs(call.rawArgs);
          if (parsed) {
            call.args = parsed;
            call.completed = true;
          }
        }
      }
    });
  }

  finish() {
    // Final attempt to parse any remaining rawArgs
    this.callMap.forEach(call => {
      if (!call.completed) {
        const parsed = this.safeParseArgs(call.rawArgs);
        if (parsed) {
          call.args = parsed;
          call.completed = true;
        }
      }
    });

    return {
      content: this.contentBuffer.trim(),
      toolCalls: Array.from(this.callMap.values()).filter(c => c.completed),
    };
  }
}

// Tests avec des chunks simulés
async function testToolCallsParser() {
  console.log('🧪 Test du ToolCallsParser...\n');

  // Test 1: Arguments malformés en chunks
  console.log('📋 Test 1: Arguments malformés en chunks');
  const parser1 = new ToolCallsParser();
  
  const chunks1 = [
    {
      delta: {
        tool_calls: [{
          index: 0,
          id: 'call_123',
          function: {
            name: 'create_note',
            arguments: '{"notebook_id":"demo"'
          }
        }]
      }
    },
    {
      delta: {
        tool_calls: [{
          index: 0,
          function: {
            arguments: ',"source_title":"Wonderful"'
          }
        }]
      }
    },
    {
      delta: {
        tool_calls: [{
          index: 0,
          function: {
            arguments: ',"markdown_content":"Test content"}'
          }
        }]
      }
    }
  ];

  chunks1.forEach(chunk => parser1.feed(chunk));
  const result1 = parser1.finish();
  
  console.log('   Content:', result1.content);
  console.log('   Tool calls:', result1.toolCalls.length);
  result1.toolCalls.forEach((call, index) => {
    console.log(`   ${index + 1}. ${call.name}:`, call.args);
  });

  // Test 2: Content + tool_calls mélangés
  console.log('\n📋 Test 2: Content + tool_calls mélangés');
  const parser2 = new ToolCallsParser();
  
  const chunks2 = [
    {
      delta: {
        content: 'Je vais créer une note pour vous...'
      }
    },
    {
      delta: {
        tool_calls: [{
          index: 0,
          id: 'call_456',
          function: {
            name: 'create_note',
            arguments: '{"source_title":"Test","notebook_id":"demo"}'
          }
        }]
      }
    },
    {
      delta: {
        content: 'Voilà, c\'est fait !'
      }
    }
  ];

  chunks2.forEach(chunk => parser2.feed(chunk));
  const result2 = parser2.finish();
  
  console.log('   Content:', result2.content);
  console.log('   Tool calls:', result2.toolCalls.length);
  result2.toolCalls.forEach((call, index) => {
    console.log(`   ${index + 1}. ${call.name}:`, call.args);
  });

  // Test 3: Arguments avec guillemets mal échappés
  console.log('\n📋 Test 3: Arguments avec guillemets mal échappés');
  const parser3 = new ToolCallsParser();
  
  const chunks3 = [
    {
      delta: {
        tool_calls: [{
          index: 0,
          id: 'call_789',
          function: {
            name: 'create_note',
            arguments: '"notebook_id":"demo","source_title":"Test"'
          }
        }]
      }
    }
  ];

  chunks3.forEach(chunk => parser3.feed(chunk));
  const result3 = parser3.finish();
  
  console.log('   Content:', result3.content);
  console.log('   Tool calls:', result3.toolCalls.length);
  result3.toolCalls.forEach((call, index) => {
    console.log(`   ${index + 1}. ${call.name}:`, call.args);
  });

  console.log('\n🎉 Tests terminés !');
  console.log('\n💡 Prêt pour intégration dans Scrivia !');
}

testToolCallsParser(); 