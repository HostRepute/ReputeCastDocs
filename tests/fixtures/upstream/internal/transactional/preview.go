package transactional

// missingProblem answers a call that lacks required variables.
func missingProblem(key string, version int, missing []string) *Problem {
	p := problem(http.StatusUnprocessableEntity, CodeMissingVariables,
		fmt.Sprintf("%s v%d needs %s. Add %s to data and call again.", key, version, joinAnd(missing), plural(len(missing), "it", "them")))
	p.Title = "Missing variables"
	p.Missing = missing
	return p
}
