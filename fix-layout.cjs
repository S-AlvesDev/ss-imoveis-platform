const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'atendimento', 'AtendimentoPlatform.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Use a wildcard whitespace regex to match the ending of the button and closing divs
const regex = /Simular Mensagem do João\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\s*;\s*\s*<\/div>\s*;\s*\}/i; // let's be even simpler:

// Let's match from "Simular Mensagem do João" to different closing brackets
const oldPart = /Simular Mensagem do João\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\s*\r?\n?\s*}\r?\n?\s*\)/i;

// Let's replace the block programmatically! We can find the index of "Simular Mensagem do João"
const targetStr = "Simular Mensagem do João";
const index = content.lastIndexOf(targetStr);

if (index !== -1) {
    console.log("Found button text! Processing rest...");
    
    // We get the substring from "Simular Mensagem do João" to the end
    const head = content.substring(0, index);
    const tail = content.substring(index);
    
    // In the tail, we replace the unbalanced tags
    // The previous tail is:
    // Simular Mensagem do João
    // </button>
    // </div>
    // </div>
    // </div>
    // )}
    // </div>
    // );
    // }
    
    // We replace it to close:
    // 1. Box 5 (Simulator Card) -> </div>
    // 2. Right Column Container -> </div>
    // 3. Main Grid -> </div>
    // 4. max-w-7xl Wrapper -> </div>
    // 5. flex-1 bg-slate-50 Container -> </div>
    // 6. activeTab check -> )}
    // 7. Outer main layout container -> </div>
    // 8. Return statement close -> );
    // 9. Component close -> }
    
    const newTail = `Simular Mensagem do João
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
        </div>
    );
}`;

    content = head + newTail;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("DOM Tree successfully balanced!");
} else {
    console.error("Button text not found!");
}
