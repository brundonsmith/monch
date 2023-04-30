
# Monch

A tasty TypeScript parser-combinator library, inspired by Rust's
[nom crate](https://github.com/rust-bakery/nom)

## Features
- Small and practical (but easy to extend!)
- Zero dependencies
- Rich tyoe inference for parsed value types and error types
- Works on Node (with types stripped), Deno, Bun, and even in the browser
  (with types stripped)

## Usage

```typescript
// JSON parser
const nil = map(
    exact('null'),
    () => null
)

const boolean = map(
    oneOf(
        exact('true'),
        exact('false')
    ),
    s => s === 'true'
)

const number = map(
    tuple(
        take1(numericChar),
        optional(
            tuple(
                exact("."),
                required(take1(numericChar), () => `Expected numbers after decimal point`)
            )
        ),
    ),
    ([front, back]) => {
        let numberString = front

        if (back != null) {
            const [_decimal, fractionDigits] = back
            numberString += `.${fractionDigits}`
        }

        return Number(numberString)
    }
)

const string = map(
    tuple(
        exact('"'),
        take0(filter(char, ch => ch !== '"')),
        required(exact('"'), () => `Expected closing quote '"'`)
    ),
    ([_0, contents, _1]) => contents
)

const commaWithWhitespace = tuple(
    whitespace,
    exact(','),
    whitespace
)

const array: Parser<unknown[], string> = input => map(
    tuple(
        exact('['),
        whitespace,
        manySep0(
            jsonValue,
            commaWithWhitespace
        ),
        whitespace,
        required(exact(']'), () => `Expected closing bracket ']'`)
    ),
    ([_0, _1, elements, _2, _3]) => elements
)(input)

const object: Parser<Record<string, unknown>, string> = input => map(
    tuple(
        exact('{'),
        whitespace,
        manySep0(
            map(
                tuple(
                    string,
                    whitespace,
                    required(exact(':'), () => `Expected ':' after object key`),
                    whitespace,
                    required(jsonValue, () => `Expected value after ':'`)
                ),
                ([key, _0, _1, _2, value]) => [key, value] as const
            ),
            commaWithWhitespace
        ),
        whitespace,
        required(exact('}'), () => `Expected closing curly brace '}'`)
    ),
    ([_0, _1, entries, _2, _3]) => Object.fromEntries(entries)
)(input)

const jsonValue: Parser<unknown, string> = input => oneOf(
    nil,
    boolean,
    number,
    string,
    array,
    object
)(input)
```

```typescript
// Calling the parser
const json = {
    "foo": "bar",
    "blah": 123.4,
    "stuff": true,
    "other": [
        1,
        2,
        null,
        false
    ]
}
const jsonString = JSON.stringify(json)
const parserInput = input(jsonString)

assertEquals(
    jsonValue(parserInput),
    {
        kind: 'success',
        input: { code: jsonString, index: jsonString.length },
        src: { code: jsonString, start: 0, end: jsonString.length },
        parsed: json
    }
)
```