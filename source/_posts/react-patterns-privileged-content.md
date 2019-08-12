---
title: 'React patterns: Privileged Content'
date: Tue, 10 Apr 2018 14:00:54 +0000
draft: false
permalink: react-patterns-privileged-content
tags: [javascript, pattern, permission, privileged, programming, react, react]
---

In the last project I worked on, some parts in the page should only be shown to privileged users. As easy as it would be to just add that bit of logic in a `render` method, it would not be idiomatic React, and it would also get cumbersome when the validation logic becomes more complex, besides the fact that we would have to add similar logic in many places in the code. DRY, as they say.

<!-- more -->

React makes it easy to solve that situation by making a component that can wrap any part of the app to hide it from unprivileged eyes.

This is the simple solution I've been using for that purpose instead: 

```javascript
import React from "react";

class PrivilegedContent extends React.PureComponent {
  state = {
      admin: isAdmin()
  };

  render() {
    if (this.state.admin !== true) {
      return <div />;
    }
    
    const { children, ...rest } = this.props;
    
    React.Children.only(children);
    const childrenWithProps = React.Children.map(children, child =>
      React.cloneElement(child, rest)
    );
    
    return {childrenWithProps};
  }
}
```

When this component mounts, it sets `state.admin` to the value of the `isAdmin` function. If `state.admin` is false, `render` will only render an empty `<div />` element. Otherwise it will render the `children` of `PrivilegedContent`.

At this point, we could simply do `return children` and hope for the best. It may even seem to work in simple cases, but it will explode in our faces if we use React-based UI frameworks like [Material-UI](https://www.material-ui.com). That's because these frameworks may be passing specific props to nested components in order to render them properly, and putting an `PrivilegedContent` in between these nested components will cut the flow of `props` being passed down. 

In order to render the children properly, we have to make sure that any props passed to `PrivilegedContent` also get passed to the component it wraps. For this, we first verify that our component only has one child by using [React.Children.only](https://reactjs.org/docs/react-api.html#reactchildrenonly), which _"Verifies that children has only one child (a React element) and returns it. Otherwise this method throws an error"_. Then we clone our `children` and append the props passed to `PrivilegedContent` to the first (and only child) using [React.Children.map](https://reactjs.org/docs/react-api.html#reactchildrenmap).

At this point, `childrenWithProps` is a clone of our children structure with added props that were passed to our `PrivilegedContent`.

You can use it like this:

## Potential improvements

There are several improvements that can be done to `PrivilegedContent`. Here are some ideas:

*   We could pass the validation function (`isAdmin` in the code above) as a prop to make the component more flexible. In case there is no validation prop, it can use one by default.
  
*   The validation function should probably be asynchronous. In our example we use a synchronous `isAdmin` function, but if we need to contact a server for validation, for example, our code above won't work.
  
*   The user could pass an extra `placeholderContent` prop that the component uses when it doesn't pass validation, instead of using a generic `div` tag like it does now.
  

Can you think of more improvements? Let me know in the comments!