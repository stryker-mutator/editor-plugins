import com.google.gson.Gson
import com.intellij.codeInspection.LocalQuickFix
import com.intellij.codeInspection.ProblemDescriptor
import com.intellij.codeInspection.ProblemsHolder
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.text.StringUtil
import com.intellij.psi.PsiElementVisitor
import com.intellij.psi.PsiFile
import com.intellij.psi.util.PsiTreeUtil
import liveplugin.registerInspection
import liveplugin.show

val exampleReport = """{
    "language": "go",
    "mutants": [
        {
            "id": "1-1",
            "mutatorName": "ConditionalExpression",
            "replacement": "true",
            "location": {
                "start": {
                    "line": 7,
                    "column": 5
                },
                "end": {
                    "line": 7,
                    "column": 35
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-2",
            "mutatorName": "ConditionalExpression",
            "replacement": "false",
            "location": {
                "start": {
                    "line": 7,
                    "column": 5
                },
                "end": {
                    "line": 7,
                    "column": 35
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-4",
            "mutatorName": "BooleanLiteral",
            "replacement": "true",
            "location": {
                "start": {
                    "line": 8,
                    "column": 10
                },
                "end": {
                    "line": 8,
                    "column": 15
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-3",
            "mutatorName": "EqualityOperator",
            "replacement": "len(original) == len(reversed)",
            "location": {
                "start": {
                    "line": 7,
                    "column": 5
                },
                "end": {
                    "line": 7,
                    "column": 35
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-5",
            "mutatorName": "EqualityOperator",
            "replacement": "i <= length",
            "location": {
                "start": {
                    "line": 15,
                    "column": 14
                },
                "end": {
                    "line": 15,
                    "column": 24
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-7",
            "mutatorName": "ConditionalExpression",
            "replacement": "false",
            "location": {
                "start": {
                    "line": 15,
                    "column": 14
                },
                "end": {
                    "line": 15,
                    "column": 24
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-6",
            "mutatorName": "EqualityOperator",
            "replacement": "i >= length",
            "location": {
                "start": {
                    "line": 15,
                    "column": 14
                },
                "end": {
                    "line": 15,
                    "column": 24
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-10",
            "mutatorName": "ConditionalExpression",
            "replacement": "false",
            "location": {
                "start": {
                    "line": 16,
                    "column": 6
                },
                "end": {
                    "line": 16,
                    "column": 51
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-8",
            "mutatorName": "UpdateOperator",
            "replacement": "i--",
            "location": {
                "start": {
                    "line": 15,
                    "column": 26
                },
                "end": {
                    "line": 15,
                    "column": 29
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-11",
            "mutatorName": "EqualityOperator",
            "replacement": "originalRunes[i] == reversedRunes[length-1-i]",
            "location": {
                "start": {
                    "line": 16,
                    "column": 6
                },
                "end": {
                    "line": 16,
                    "column": 51
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-9",
            "mutatorName": "ConditionalExpression",
            "replacement": "true",
            "location": {
                "start": {
                    "line": 16,
                    "column": 6
                },
                "end": {
                    "line": 16,
                    "column": 51
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-12",
            "mutatorName": "ArithmeticOperator",
            "replacement": "length - 1 + i",
            "location": {
                "start": {
                    "line": 16,
                    "column": 40
                },
                "end": {
                    "line": 16,
                    "column": 50
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-13",
            "mutatorName": "ArithmeticOperator",
            "replacement": "length + 1",
            "location": {
                "start": {
                    "line": 16,
                    "column": 40
                },
                "end": {
                    "line": 16,
                    "column": 48
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-14",
            "mutatorName": "BooleanLiteral",
            "replacement": "true",
            "location": {
                "start": {
                    "line": 17,
                    "column": 11
                },
                "end": {
                    "line": 17,
                    "column": 16
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-15",
            "mutatorName": "BooleanLiteral",
            "replacement": "false",
            "location": {
                "start": {
                    "line": 21,
                    "column": 9
                },
                "end": {
                    "line": 21,
                    "column": 13
                }
            },
            "status": "NoCoverage",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-16",
            "mutatorName": "ConditionalExpression",
            "replacement": "false",
            "location": {
                "start": {
                    "line": 28,
                    "column": 14
                },
                "end": {
                    "line": 28,
                    "column": 34
                }
            },
            "status": "Killed",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-17",
            "mutatorName": "EqualityOperator",
            "replacement": "i <= len(outputRunes)",
            "location": {
                "start": {
                    "line": 28,
                    "column": 14
                },
                "end": {
                    "line": 28,
                    "column": 34
                }
            },
            "status": "Killed",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-18",
            "mutatorName": "EqualityOperator",
            "replacement": "i >= len(outputRunes)",
            "location": {
                "start": {
                    "line": 28,
                    "column": 14
                },
                "end": {
                    "line": 28,
                    "column": 34
                }
            },
            "status": "Killed",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-19",
            "mutatorName": "UpdateOperator",
            "replacement": "i--",
            "location": {
                "start": {
                    "line": 28,
                    "column": 36
                },
                "end": {
                    "line": 28,
                    "column": 39
                }
            },
            "status": "Killed",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-20",
            "mutatorName": "BlockStatement",
            "replacement": "{}",
            "location": {
                "start": {
                    "line": 28,
                    "column": 40
                },
                "end": {
                    "line": 35,
                    "column": 3
                }
            },
            "status": "Killed",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-21",
            "mutatorName": "ArithmeticOperator",
            "replacement": "len(s) + 1",
            "location": {
                "start": {
                    "line": 41,
                    "column": 11
                },
                "end": {
                    "line": 41,
                    "column": 19
                }
            },
            "status": "Killed",
            "coveredBy": null,
            "killedBy": null
        },
        {
            "id": "1-22",
            "mutatorName": "ArithmeticOperator",
            "replacement": "len(s) + 1",
            "location": {
                "start": {
                    "line": 43,
                    "column": 12
                },
                "end": {
                    "line": 43,
                    "column": 20
                }
            },
            "status": "Survived",
            "coveredBy": null,
            "killedBy": null
        }
    ],
    "source": "package src\n\nimport \"math/rand\"\n\n// IsReverse checks if reversed is the reverse of original\nfunc IsReverse(original, reversed string) bool {\n\tif len(original) != len(reversed) {\n\t\treturn false\n\t}\n\n\toriginalRunes := []rune(original)\n\treversedRunes := []rune(reversed)\n\tlength := len(originalRunes)\n\n\tfor i := 0; i < length; i++ {\n\t\tif originalRunes[i] != reversedRunes[length-1-i] {\n\t\t\treturn false\n\t\t}\n\t}\n\n\treturn true\n}\n\nfunc Shuffle(input string) string {\n\tinputRunes := []rune(input)\n\toutputRunes := make([]rune, len(inputRunes))\n\n\tfor i := 0; i < len(outputRunes); i++ {\n\t\tselectedIndex := rand.Intn(len(inputRunes)) //nolint:gosec\n\t\tselectedRune := inputRunes[selectedIndex]\n\n\t\tinputRunes = remove(inputRunes, selectedIndex)\n\n\t\toutputRunes[i] = selectedRune\n\t}\n\n\treturn string(outputRunes)\n}\n\nfunc remove(s []rune, i int) []rune {\n\ts[i] = s[len(s)-1]\n\n\treturn s[:len(s)-1]\n}\n\nfunc Reverse(input string) string {\n\n\t// known incorrect implementation, please do not fix it is part of the example\n\treturn Shuffle(input)\n}\n"
}"""

registerInspection(HasMutationInspection())
if (!isIdeStartup) {
    show("Loaded mutation inspection<br/>It shows expressions for which there is a surviving mutation")
}

data class Report(val mutants: List<MutantResult>)

data class MutantResult(
    val id: String,
    val replacement : String,
    val location : Location
)

data class Location(val start: Position, val end : Position )

data class Position(val line: Int, val column : Int )

class DummyVisitorFile(private val holder: ProblemsHolder, isOnTheFly: Boolean) : PsiElementVisitor() {

    private val gson = Gson()
    private val report = gson.fromJson(exampleReport, Report::class.java)

    // maybe use visitElement, or maybe use visitFile and try to use PsiFile.findElementAt()
    override fun visitFile(file: PsiFile) {
        show(file.fileType.name)
        if(file.fileType.name != "Go"){
            return
        }

        report.mutants.forEach() { m ->
            val line =m.location.start.line -1
            val column = m.location.start.column -1 // compensate for one based index
            val endColumn = m.location.end.column -1 -1// <- endColumn

            val text = file.text
            val offset = StringUtil.lineColToOffset(text, line, column)
            val offsetEnd = StringUtil.lineColToOffset(text, line, endColumn)


            val element = file.findElementAt(offset)
            val endElem = file.findElementAt(offsetEnd);

            var commonParent = element
            if (element != endElem) {
                commonParent =  PsiTreeUtil.findCommonParent(element, endElem)
            }
            if (commonParent != null) {
                val id = m.id
                holder.registerProblem(commonParent, "Found survived mutation $id", RunMutationQuickFix(m.replacement))
            }
        }

        super.visitFile(file)
    }
}

class HasMutationInspection : com.intellij.codeInspection.LocalInspectionTool() {
    override fun buildVisitor(holder: ProblemsHolder, isOnTheFly: Boolean) : PsiElementVisitor {
        return DummyVisitorFile(holder, isOnTheFly)
    }

    override fun getDisplayName() = "Highlight survived mutations"
    override fun getShortName() = "HasMutationInspection"
    override fun getGroupDisplayName() = "Live plugin"
    override fun isEnabledByDefault() = true
}


// TODO figure out a better base class to communicate with the problem holder
class RunMutationQuickFix(private val alternative : String) : LocalQuickFix {
    override fun applyFix(project: Project, descriptor: ProblemDescriptor) {
        show("running test with mutation for:", descriptor.psiElement.toString())
        // val stringLiteral = KtPsiFactory(descriptor.psiElement).createExpression("\"Hello World\"")
        // descriptor.psiElement.replace(stringLiteral)
    }
    override fun getName() = "Execute mutation \"$alternative\""
    override fun getFamilyName() = name
}
