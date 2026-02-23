# Pose Reference Images

Add your pose reference images to this folder and update the `mirror-me.html` file.

## Image Requirements:
- Format: PNG or JPG
- Recommended size: 300x400 pixels
- Clear, well-lit images showing the target pose

## Suggested Filenames:
1. `hands-up.png` - Person with both arms raised above head
2. `standing.png` - Person standing naturally with arms down
3. `jumping-jack.png` - Person with legs apart and arms out
4. `tree-pose.png` - Person standing on one leg
5. `hands-together.png` - Person with hands joined in front

## How to Add Images:

Edit `frontend/modules/dyspraxia/mirror-me.html` and find this section around line 55:

```javascript
const poses = [
    { emoji: '🙋', name: 'Hands Up', desc: 'Raise both arms above your head', image: '' },
    { emoji: '🚶', name: 'Standing', desc: 'Stand naturally with arms down', image: '' },
    // ...
];
```

Update the `image` property with the path to your image:

```javascript
const poses = [
    { emoji: '🙋', name: 'Hands Up', desc: 'Raise both arms above your head', image: '../../assets/poses/hands-up.png' },
    { emoji: '🚶', name: 'Standing', desc: 'Stand naturally with arms down', image: '../../assets/poses/standing.png' },
    // ...
];
```

If no image is provided, the emoji will be displayed instead.
