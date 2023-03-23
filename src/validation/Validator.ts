const _string = Symbol('string')
type Types = 'string' | 'number' | 'boolean' | [typeof _string] | ['number'] | string[] 

export class Validator {
    static argsCheck(required: Types[], ...actual: any[]) {
        for (let i = 0; i < required.length; i++) {
            const act = actual[i]
            const req = required[i]

            if (typeof act !== req)
                return false

            if (Array.isArray(req)) {
                if (req.length === 1) {
                    if (req[0] === _string || req[0] === 'number') {
                        if (
                            !Array.isArray(act) || 
                            (Array.isArray(act) && 
                            act.some(i => typeof i !== req[0]))
                        ) {
                            return false
                        }
                    }
                }
            }

        }
    }
}

function s(arg1: string, arg2: number) {
    Validator.argsCheck(['string', 'number'], ...arguments)

}