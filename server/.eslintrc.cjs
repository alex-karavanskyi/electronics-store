module.exports = {
 root:true, env:{node:true,es2022:true}, parser:'@typescript-eslint/parser', parserOptions:{ecmaVersion:'latest',sourceType:'module'}, plugins:['@typescript-eslint'],extends:['eslint:recommended'],
 rules:{'no-unused-vars':'off','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}],'no-undef':'off','no-restricted-imports':['error',{patterns:['next','next/*','**/client/**','electronics-store','electronics-store-client']}]},ignorePatterns:['node_modules/','dist/','.verification/'],
}
