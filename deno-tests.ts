import { assertEquals } from "https://deno.land/std@0.171.0/testing/asserts.ts";

import { Parser, char, exact, filter, input, manySep0, map, numericChar, oneOf, optional, required, take0, take1, tuple, whitespace } from "./index.ts"

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

const jsonDocument = map(
    tuple(
        whitespace,
        jsonValue,
        whitespace
    ),
    ([_0, value, _1]) => value
)

Deno.test({
    name: 'JSON parser success',
    fn() {
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
            jsonDocument(parserInput),
            {
                kind: 'success',
                input: { code: jsonString, index: jsonString.length },
                src: { code: jsonString, start: 0, end: jsonString.length },
                parsed: json
            }
        )
    }
})

Deno.test({
    name: 'JSON parser error 1',
    fn() {
        const jsonString = `"foo`
        const parserInput = input(jsonString)

        assertEquals(
            jsonDocument(parserInput),
            {
                kind: 'error',
                input: { code: jsonString, index: 4 },
                error: `Expected closing quote '"'`
            }
        )
    }
})

Deno.test({
    name: 'JSON parser error 2',
    fn() {
        const jsonString = `{ "foo": 12`
        const parserInput = input(jsonString)

        assertEquals(
            jsonDocument(parserInput),
            {
                kind: 'error',
                input: { code: jsonString, index: 11 },
                error: `Expected closing curly brace '}'`
            }
        )
    }
})