/**
 * Cogno Solution - Learning Modules Configuration
 * Defines all activities for dyslexia, dyscalculia, dysgraphia, and dyspraxia modules
 */

const moduleConfig = {
    dyslexia: {
        name: 'Dyslexia',
        icon: 'fa-book',
        color: '#0066cc',
        description: 'Reading and language support activities',
        activities: [
            {
                id: 1,
                name: 'Text Reader',
                description: 'Read text with visual support and speech',
                icon: 'fa-volume-up',
                path: 'modules/dyslexia/reader.html',
                difficulty: 'Beginner'
            },
            {
                id: 2,
                name: 'Text Simplifier',
                description: 'Simplify complex text for easier reading',
                icon: 'fa-simplify',
                path: 'modules/dyslexia/simplify.html',
                difficulty: 'Beginner'
            },
            {
                id: 3,
                name: 'Letter Match',
                description: 'Match uppercase and lowercase letters',
                icon: 'fa-square',
                path: 'modules/dyslexia/letter-match.html',
                difficulty: 'Beginner'
            },
            {
                id: 4,
                name: 'Word Builder',
                description: 'Arrange letters to form words',
                icon: 'fa-cubes',
                path: 'modules/dyslexia/word-builder.html',
                difficulty: 'Intermediate'
            },
            {
                id: 5,
                name: 'Sight Words',
                description: 'Learn and recognize common sight words',
                icon: 'fa-eye',
                path: 'modules/dyslexia/sight-words.html',
                difficulty: 'Beginner'
            },
            {
                id: 6,
                name: 'Rhyme Time',
                description: 'Identify rhyming words and patterns',
                icon: 'fa-music',
                path: 'modules/dyslexia/rhyme-time.html',
                difficulty: 'Intermediate'
            },
            {
                id: 7,
                name: 'Spelling Bee',
                description: 'Practice spelling with audio guidance',
                icon: 'fa-spell-check',
                path: 'modules/dyslexia/spelling-bee.html',
                difficulty: 'Intermediate'
            },
            {
                id: 8,
                name: 'Word Scramble',
                description: 'Unscramble letters to form words',
                icon: 'fa-shuffle',
                path: 'modules/dyslexia/word-scramble.html',
                difficulty: 'Intermediate'
            }
        ]
    },
    
    dyscalculia: {
        name: 'Dyscalculia',
        icon: 'fa-calculator',
        color: '#10b981',
        description: 'Mathematics and number skills development',
        activities: [
            {
                id: 1,
                name: 'Number Line',
                description: 'Understand number position and magnitude',
                icon: 'fa-line-chart',
                path: 'modules/dyscalculia/number-line.html',
                difficulty: 'Beginner'
            },
            {
                id: 2,
                name: 'Addition',
                description: 'Learn addition with visual blocks',
                icon: 'fa-plus',
                path: 'modules/dyscalculia/addition.html',
                difficulty: 'Beginner'
            },
            {
                id: 3,
                name: 'Subtraction',
                description: 'Understand subtraction as removal',
                icon: 'fa-minus',
                path: 'modules/dyscalculia/subtraction.html',
                difficulty: 'Beginner'
            },
            {
                id: 4,
                name: 'Multiplication',
                description: 'Learn multiplication with arrays',
                icon: 'fa-times',
                path: 'modules/dyscalculia/multiplication.html',
                difficulty: 'Intermediate'
            },
            {
                id: 5,
                name: 'Division',
                description: 'Understand division with equal groups',
                icon: 'fa-divide',
                path: 'modules/dyscalculia/division.html',
                difficulty: 'Intermediate'
            },
            {
                id: 6,
                name: 'Counting',
                description: 'Interactive counting practice',
                icon: 'fa-hand-pointer',
                path: 'modules/dyscalculia/counting.html',
                difficulty: 'Beginner'
            },
            {
                id: 7,
                name: 'Number Match',
                description: 'Match numbers to quantities',
                icon: 'fa-equals',
                path: 'modules/dyscalculia/number-match.html',
                difficulty: 'Beginner'
            },
            {
                id: 8,
                name: 'Math Pop',
                description: 'Timed math game with bubbles',
                icon: 'fa-bomb',
                path: 'modules/dyscalculia/math-pop.html',
                difficulty: 'Advanced'
            },
            {
                id: 9,
                name: 'Number Puzzles',
                description: 'Solve mathematical puzzles',
                icon: 'fa-puzzle-piece',
                path: 'modules/dyscalculia/number-puzzle.html',
                difficulty: 'Intermediate'
            }
        ]
    },
    
    dysgraphia: {
        name: 'Dysgraphia',
        icon: 'fa-pen',
        color: '#a855f7',
        description: 'Handwriting and writing skills support',
        activities: [
            {
                id: 1,
                name: 'Letter Tracing',
                description: 'Trace letters with visual guidance',
                icon: 'fa-pen',
                path: 'modules/dysgraphia/letter-tracing.html',
                difficulty: 'Beginner'
            },
            {
                id: 2,
                name: 'Letter Formation',
                description: 'Learn step-by-step letter formation',
                icon: 'fa-pen-fancy',
                path: 'modules/dysgraphia/letter-formation.html',
                difficulty: 'Beginner'
            },
            {
                id: 3,
                name: 'Alphabet Practice',
                description: 'Practice writing all 26 letters',
                icon: 'fa-a',
                path: 'modules/dysgraphia/alphabet-practice.html',
                difficulty: 'Beginner'
            },
            {
                id: 4,
                name: 'Word Tracing',
                description: 'Trace words for spelling practice',
                icon: 'fa-pen-to-square',
                path: 'modules/dysgraphia/word-tracing.html',
                difficulty: 'Intermediate'
            },
            {
                id: 5,
                name: 'Spelling Write',
                description: 'Type words from spelling list',
                icon: 'fa-spell-check',
                path: 'modules/dysgraphia/spelling-write.html',
                difficulty: 'Intermediate'
            },
            {
                id: 6,
                name: 'Copy Practice',
                description: 'Copy text from a model',
                icon: 'fa-copy',
                path: 'modules/dysgraphia/copy-practice.html',
                difficulty: 'Intermediate'
            },
            {
                id: 7,
                name: 'Free Draw',
                description: 'Create artwork and practice motor control',
                icon: 'fa-paintbrush',
                path: 'modules/dysgraphia/free-draw.html',
                difficulty: 'Beginner'
            },
            {
                id: 8,
                name: 'Shape Tracing',
                description: 'Trace geometric shapes',
                icon: 'fa-shapes',
                path: 'modules/dysgraphia/shape-tracing.html',
                difficulty: 'Intermediate'
            },
            {
                id: 9,
                name: 'Sentence Writing',
                description: 'Write sentences about prompts',
                icon: 'fa-pen-nib',
                path: 'modules/dysgraphia/sentence-write.html',
                difficulty: 'Advanced'
            }
        ]
    },
    
    dyspraxia: {
        name: 'Dyspraxia',
        icon: 'fa-hand',
        color: '#ec4899',
        description: 'Coordination and motor skills support',
        activities: [
            {
                id: 1,
                name: 'Finger Tap',
                description: 'Test finger tapping speed',
                icon: 'fa-hand',
                path: 'modules/dyspraxia/finger-tap.html',
                difficulty: 'Beginner'
            },
            {
                id: 2,
                name: 'Tapping Sequence',
                description: 'Follow the tapping pattern',
                icon: 'fa-gamepad',
                path: 'modules/dyspraxia/tapping-sequence.html',
                difficulty: 'Intermediate'
            },
            {
                id: 3,
                name: 'Drag Targets',
                description: 'Test hand-eye coordination',
                icon: 'fa-arrows-move',
                path: 'modules/dyspraxia/drag-targets.html',
                difficulty: 'Intermediate'
            },
            {
                id: 4,
                name: 'Click Sequence',
                description: 'Click objects in correct order',
                icon: 'fa-circle',
                path: 'modules/dyspraxia/click-sequence.html',
                difficulty: 'Intermediate'
            },
            {
                id: 5,
                name: 'Balance Beam',
                description: 'Keep balance on the beam',
                icon: 'fa-person',
                path: 'modules/dyspraxia/balance-beam.html',
                difficulty: 'Advanced'
            },
            {
                id: 6,
                name: 'Obstacle Course',
                description: 'Navigate through obstacles',
                icon: 'fa-bolt',
                path: 'modules/dyspraxia/obstacle-course.html',
                difficulty: 'Advanced'
            },
            {
                id: 7,
                name: 'Mirror Moves',
                description: 'Copy the movement patterns',
                icon: 'fa-users',
                path: 'modules/dyspraxia/mirror-moves.html',
                difficulty: 'Intermediate'
            },
            {
                id: 8,
                name: 'Rhythm Tap',
                description: 'Tap to the rhythm',
                icon: 'fa-music',
                path: 'modules/dyspraxia/rhythm-tap.html',
                difficulty: 'Intermediate'
            },
            {
                id: 9,
                name: 'Catch Objects',
                description: 'Catch falling objects',
                icon: 'fa-basket-shopping',
                path: 'modules/dyspraxia/catch-objects.html',
                difficulty: 'Advanced'
            }
        ]
    }
};

// Function to get module by name
function getModule(moduleName) {
    return moduleConfig[moduleName] || null;
}

// Function to get activity by module and activity ID
function getActivity(moduleName, activityId) {
    const module = getModule(moduleName);
    if (!module) return null;
    return module.activities.find(a => a.id === activityId) || null;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { moduleConfig, getModule, getActivity };
}
